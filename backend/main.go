package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	clay "github.com/go-go-golems/clay/pkg"
	geppettobootstrap "github.com/go-go-golems/geppetto/pkg/cli/bootstrap"
	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
	geppettosections "github.com/go-go-golems/geppetto/pkg/sections"
	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	"github.com/go-go-golems/glazed/pkg/cli"
	"github.com/go-go-golems/glazed/pkg/cmds"
	"github.com/go-go-golems/glazed/pkg/cmds/fields"
	"github.com/go-go-golems/glazed/pkg/cmds/logging"
	"github.com/go-go-golems/glazed/pkg/cmds/schema"
	cmd_sources "github.com/go-go-golems/glazed/pkg/cmds/sources"
	"github.com/go-go-golems/glazed/pkg/cmds/values"
	profilebootstrap "github.com/go-go-golems/pinocchio/pkg/cmds/profilebootstrap"
	"github.com/spf13/cobra"
	"github.com/wesen/cozodb-editor/backend/pkg/api"
	"github.com/wesen/cozodb-editor/backend/pkg/cozo"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
	"github.com/wesen/cozodb-editor/backend/pkg/notebook"
	"gopkg.in/yaml.v3"
)

type ServerSettings struct {
	Addr      string `glazed:"addr"`
	Engine    string `glazed:"engine"`
	DBPath    string `glazed:"db-path"`
	AppDBPath string `glazed:"app-db-path"`
	ViteURL   string `glazed:"vite"`
}

type ServerCommand struct {
	*cmds.CommandDescription
}

var _ cmds.WriterCommand = &ServerCommand{}

type DebugSettings struct {
	PrintInferenceSettings        bool `glazed:"print-inference-settings"`
	PrintInferenceSettingsSource  bool `glazed:"print-inference-settings-source"`
	PrintInferenceSettingsSources bool `glazed:"print-inference-settings-sources"`
}

const (
	serverCommandName  = "cozodb-editor-backend"
	bootstrapAppName   = "cozodb-editor"
	bootstrapEnvPrefix = "COZODB_EDITOR"
	defaultProfileSlug = "gpt-5-mini"
)

func main() {
	rootCmd, err := newRootCommand()
	if err != nil {
		cobra.CheckErr(err)
	}

	cobra.CheckErr(rootCmd.Execute())
}

func newRootCommand() (*cobra.Command, error) {
	command, err := newServerCommand()
	if err != nil {
		return nil, err
	}

	cobraCommand, err := cli.BuildCobraCommandFromCommand(command, cli.WithParserConfig(cli.CobraParserConfig{
		MiddlewaresFunc: appCobraMiddlewares,
	}), cli.WithCobraShortHelpSections(values.DefaultSlug, profilebootstrap.ProfileSettingsSectionSlug))
	if err != nil {
		return nil, err
	}

	cobraCommand.SilenceUsage = true
	cobraCommand.SilenceErrors = true
	cobraCommand.PersistentPreRunE = func(cmd *cobra.Command, args []string) error {
		return logging.InitLoggerFromCobra(cmd)
	}

	if err := clay.InitGlazed(bootstrapAppName, cobraCommand); err != nil {
		return nil, err
	}

	for _, name := range []string{"print-yaml", "print-parsed-fields", "print-schema"} {
		if flag := cobraCommand.Flags().Lookup(name); flag != nil {
			flag.Hidden = true
		}
	}

	return cobraCommand, nil
}

func newServerCommand() (*ServerCommand, error) {
	profileSettingsSection, err := appBootstrapConfig().NewProfileSection()
	if err != nil {
		return nil, err
	}
	debugSection, err := newInferenceDebugSection()
	if err != nil {
		return nil, err
	}

	return &ServerCommand{
		CommandDescription: cmds.NewCommandDescription(
			serverCommandName,
			cmds.WithShort("Run the CozoDB editor backend"),
			cmds.WithLong("Run the CozoDB editor backend with Glazed flags and shared Geppetto/Pinocchio profile bootstrap inference settings."),
			cmds.WithFlags(
				fields.New("addr", fields.TypeString, fields.WithDefault(":8080"), fields.WithHelp("HTTP listen address")),
				fields.New("engine", fields.TypeString, fields.WithDefault("mem"), fields.WithHelp("CozoDB engine (mem, sqlite)")),
				fields.New("db-path", fields.TypeString, fields.WithDefault(""), fields.WithHelp("CozoDB database path (for sqlite engine)")),
				fields.New("app-db-path", fields.TypeString, fields.WithDefault("./data/cozodb-editor-app.sqlite"), fields.WithHelp("Application SQLite database path for notebooks and timeline state")),
				fields.New("vite", fields.TypeString, fields.WithDefault("http://localhost:5173"), fields.WithHelp("Vite dev server URL (empty to disable proxy)")),
			),
			cmds.WithSections(profileSettingsSection, debugSection),
		),
	}, nil
}

func newInferenceDebugSection() (schema.Section, error) {
	return schema.NewSection(
		"debug-settings",
		"Debug settings",
		schema.WithFields(
			fields.New(
				"print-inference-settings",
				fields.TypeBool,
				fields.WithDefault(false),
				fields.WithHelp("Print the final resolved inference settings and exit"),
			),
			fields.New(
				"print-inference-settings-source",
				fields.TypeBool,
				fields.WithDefault(false),
				fields.WithHelp("Print the final resolved inference settings together with source logs and exit"),
			),
			fields.New(
				"print-inference-settings-sources",
				fields.TypeBool,
				fields.WithDefault(false),
				fields.WithHelp("Alias for --print-inference-settings-source"),
			),
		),
	)
}

func appCobraMiddlewares(parsedCommandSections *values.Values, cmd *cobra.Command, args []string) ([]cmd_sources.Middleware, error) {
	configFiles, err := geppettobootstrap.ResolveCLIConfigFiles(appBootstrapConfig(), parsedCommandSections)
	if err != nil {
		return nil, err
	}

	return []cmd_sources.Middleware{
		cmd_sources.FromCobra(cmd, fields.WithSource("cobra")),
		cmd_sources.FromArgs(args, fields.WithSource("arguments")),
		cmd_sources.FromEnv(bootstrapEnvPrefix, fields.WithSource("env")),
		cmd_sources.FromFiles(
			configFiles,
			cmd_sources.WithConfigFileMapper(profilebootstrap.MapPinocchioConfigFile),
			cmd_sources.WithParseOptions(fields.WithSource("config")),
		),
		cmd_sources.FromDefaults(fields.WithSource(fields.SourceDefaults)),
	}, nil
}

func (c *ServerCommand) RunIntoWriter(ctx context.Context, parsed *values.Values, w io.Writer) error {
	settings := &ServerSettings{}
	if err := parsed.DecodeSectionInto(values.DefaultSlug, settings); err != nil {
		return err
	}

	effectiveParsed, err := applyApplicationProfileDefaults(parsed)
	if err != nil {
		return err
	}

	profileSelection, err := geppettobootstrap.ResolveCLIProfileSelection(appBootstrapConfig(), effectiveParsed)
	if err != nil {
		return err
	}
	if profileSelection.Profile != "" && len(profileSelection.ProfileRegistries) == 0 {
		return &gepprofiles.ValidationError{
			Field:  "profile-settings.profile-registries",
			Reason: "must be configured when profile-settings.profile is set",
		}
	}

	resolved, err := geppettobootstrap.ResolveCLIEngineSettings(ctx, appBootstrapConfig(), effectiveParsed)
	if err != nil {
		return err
	}
	if resolved.Close != nil {
		defer resolved.Close()
	}

	debugSettings := &DebugSettings{}
	if err := effectiveParsed.DecodeSectionInto("debug-settings", debugSettings); err != nil {
		return err
	}
	if debugSettings.PrintInferenceSettingsSource || debugSettings.PrintInferenceSettingsSources {
		traceParsed, err := buildInferenceTraceParsedValues(effectiveParsed)
		if err != nil {
			return err
		}
		trace, err := profilebootstrap.BuildInferenceSettingsSourceTrace(nil, traceParsed, resolved)
		if err != nil {
			return err
		}
		return writeRedactedYAML(w, trace)
	}
	if debugSettings.PrintInferenceSettings {
		return writeRedactedYAML(w, resolved.FinalInferenceSettings)
	}

	return runServer(ctx, settings, resolved.FinalInferenceSettings)
}

func appBootstrapConfig() geppettobootstrap.AppBootstrapConfig {
	return geppettobootstrap.AppBootstrapConfig{
		AppName:          bootstrapAppName,
		EnvPrefix:        bootstrapEnvPrefix,
		ConfigFileMapper: profilebootstrap.MapPinocchioConfigFile,
		NewProfileSection: func() (schema.Section, error) {
			opts := []geppettosections.ProfileSettingsSectionOption{}
			if defaultRegistry := defaultPinocchioProfileRegistryIfPresent(); defaultRegistry != "" {
				opts = append(opts, geppettosections.WithProfileRegistriesDefault(defaultRegistry))
			}
			return geppettosections.NewProfileSettingsSection(opts...)
		},
		BuildBaseSections: func() ([]schema.Section, error) {
			return geppettosections.CreateGeppettoSections()
		},
	}
}

func defaultPinocchioProfileRegistryIfPresent() string {
	configDir, err := os.UserConfigDir()
	if err != nil || strings.TrimSpace(configDir) == "" {
		return ""
	}

	path := filepath.Join(configDir, "pinocchio", "profiles.yaml")
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return ""
	}

	return path
}

func buildInferenceTraceParsedValues(parsed *values.Values) (*values.Values, error) {
	cfg := appBootstrapConfig()
	baseSections, err := cfg.BuildBaseSections()
	if err != nil {
		return nil, err
	}

	traceParsed := values.New()
	baseSchema := schema.NewSchema(schema.WithSections(baseSections...))
	configFiles, err := geppettobootstrap.ResolveCLIConfigFiles(cfg, parsed)
	if err != nil {
		return nil, err
	}
	if err := cmd_sources.Execute(
		baseSchema,
		traceParsed,
		cmd_sources.FromEnv(cfg.EnvPrefix, fields.WithSource("env")),
		cmd_sources.FromFiles(
			configFiles,
			cmd_sources.WithConfigFileMapper(cfg.ConfigFileMapper),
			cmd_sources.WithParseOptions(fields.WithSource("config")),
		),
		cmd_sources.FromDefaults(fields.WithSource(fields.SourceDefaults)),
	); err != nil {
		return nil, err
	}

	if parsed != nil {
		if err := traceParsed.Merge(parsed); err != nil {
			return nil, err
		}
	}
	return traceParsed, nil
}

func writeRedactedYAML(w io.Writer, value any) error {
	raw, err := yaml.Marshal(value)
	if err != nil {
		return err
	}

	var decoded any
	if err := yaml.Unmarshal(raw, &decoded); err != nil {
		return err
	}

	encoder := yaml.NewEncoder(w)
	defer func() {
		_ = encoder.Close()
	}()
	return encoder.Encode(redactSensitiveValues(decoded, nil))
}

func redactSensitiveValues(value any, path []string) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, item := range typed {
			out[key] = redactSensitiveValues(item, append(path, key))
		}
		return out
	case []any:
		out := make([]any, len(typed))
		for i, item := range typed {
			out[i] = redactSensitiveValues(item, path)
		}
		return out
	case string:
		if isSensitivePath(path) && strings.TrimSpace(typed) != "" {
			return summarizeSensitiveValue(typed)
		}
		return typed
	default:
		return value
	}
}

func summarizeSensitiveValue(value string) string {
	sum := sha256.Sum256([]byte(value))
	fingerprint := hex.EncodeToString(sum[:4])
	if len(value) <= 4 {
		return "<redacted len=" + strconv.Itoa(len(value)) + " sha256=" + fingerprint + ">"
	}
	tail := value[len(value)-4:]
	return "<redacted len=" + strconv.Itoa(len(value)) + " tail=" + tail + " sha256=" + fingerprint + ">"
}

func isSensitivePath(path []string) bool {
	if len(path) == 0 {
		return false
	}

	last := strings.ToLower(strings.TrimSpace(path[len(path)-1]))
	if isSensitiveLeafKey(last) {
		return true
	}

	if last != "value" && last != "map-value" {
		return false
	}

	for _, part := range path[:len(path)-1] {
		if isSensitiveLeafKey(strings.ToLower(strings.TrimSpace(part))) {
			return true
		}
	}
	return false
}

func isSensitiveLeafKey(key string) bool {
	return key == "authorization" || strings.HasSuffix(key, "-api-key")
}

func applyApplicationProfileDefaults(parsed *values.Values) (*values.Values, error) {
	selection, err := geppettobootstrap.ResolveCLIProfileSelection(appBootstrapConfig(), parsed)
	if err != nil {
		return nil, err
	}
	if selection.Profile != "" || len(selection.ProfileRegistries) == 0 {
		return parsed, nil
	}

	profileSection, err := appBootstrapConfig().NewProfileSection()
	if err != nil {
		return nil, err
	}

	ret := parsed.Clone()
	profileValues := ret.GetOrCreate(profileSection)
	if err := values.WithFieldValue("profile", defaultProfileSlug, fields.WithSource("app-default"))(profileValues); err != nil {
		return nil, err
	}
	return ret, nil
}

func runServer(ctx context.Context, settings *ServerSettings, inferenceSettings *aisettings.InferenceSettings) error {
	log.Printf("[MAIN] Opening CozoDB (engine=%s, path=%s)", settings.Engine, settings.DBPath)
	runtime, err := cozo.NewManager(settings.Engine, settings.DBPath)
	if err != nil {
		return err
	}
	defer runtime.Close()

	result, err := runtime.Query("?[] <- [[1, 'hello']]", nil)
	if err != nil {
		return err
	}
	log.Printf("[MAIN] CozoDB ready: %v", result.OK)

	var hintEngine *hints.Engine
	hintEngine, err = hints.NewEngineFromSettings(inferenceSettings)
	if err != nil {
		log.Printf("[MAIN] AI hints disabled: %v", err)
	} else {
		log.Printf("[MAIN] AI hints enabled (%s)", hints.DescribeInferenceSettings(inferenceSettings))
	}

	notebookSvc, err := notebook.OpenService(settings.AppDBPath, runtime)
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := notebookSvc.Close(); closeErr != nil {
			log.Printf("[MAIN] notebook service close error: %v", closeErr)
		}
	}()

	srv := &api.Server{Runtime: runtime, Notebook: notebookSvc}
	wsHandler := &api.WSHandler{Runtime: runtime, Engine: hintEngine}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/query", srv.HandleQuery)
	mux.HandleFunc("/api/schema", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/schema" && r.URL.Path != "/api/schema/" {
			srv.HandleSchemaDetail(w, r)
			return
		}
		srv.HandleSchema(w, r)
	})
	mux.HandleFunc("/api/schema/", srv.HandleSchemaDetail)
	mux.HandleFunc("/api/notebooks", srv.HandleCreateNotebook)
	mux.HandleFunc("/api/notebooks/bootstrap", srv.HandleBootstrapNotebook)
	mux.HandleFunc("/api/notebooks/", srv.HandleNotebook)
	mux.HandleFunc("/api/notebook-cells/", srv.HandleNotebookCell)
	mux.HandleFunc("/api/runtime/reset-kernel", srv.HandleResetKernel)
	mux.HandleFunc("/ws/hints", wsHandler.HandleWS)

	if strings.TrimSpace(settings.ViteURL) != "" {
		viteTarget, err := url.Parse(settings.ViteURL)
		if err != nil {
			return err
		}
		proxy := httputil.NewSingleHostReverseProxy(viteTarget)
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			proxy.ServeHTTP(w, r)
		})
		log.Printf("[MAIN] Proxying / to %s", settings.ViteURL)
	}

	httpServer := &http.Server{
		Addr:    settings.Addr,
		Handler: corsMiddleware(mux),
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("[MAIN] server shutdown error: %v", err)
		}
	}()

	log.Printf("[MAIN] Listening on %s", settings.Addr)
	err = httpServer.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
