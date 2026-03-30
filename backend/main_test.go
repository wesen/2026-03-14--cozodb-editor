package main

import (
	"os"
	"path/filepath"
	"testing"

	geppettobootstrap "github.com/go-go-golems/geppetto/pkg/cli/bootstrap"
	"github.com/stretchr/testify/require"
)

func TestServerCommand_UsesApplicationBootstrapAndKeepsCLILean(t *testing.T) {
	rootCmd, err := newRootCommand()
	require.NoError(t, err)

	require.Equal(t, serverCommandName, rootCmd.Use)
	require.Equal(t, "cozodb-editor", bootstrapAppName)

	require.Nil(t, rootCmd.Flags().Lookup("ai-engine"))
	require.Nil(t, rootCmd.Flags().Lookup("ai-api-type"))

	profileFlag := rootCmd.Flags().Lookup("profile")
	require.NotNil(t, profileFlag)
	require.Empty(t, profileFlag.DefValue)
	require.NotNil(t, rootCmd.Flags().Lookup("profile-registries"))
	require.NotNil(t, rootCmd.Flags().Lookup("print-inference-settings"))

	configFlag := rootCmd.Flags().Lookup("config-file")
	require.NotNil(t, configFlag)
	require.False(t, configFlag.Hidden)

	for _, name := range []string{"print-yaml", "print-parsed-fields", "print-schema"} {
		flag := rootCmd.Flags().Lookup(name)
		require.NotNil(t, flag)
		require.True(t, flag.Hidden)
	}
}

func TestApplyApplicationProfileDefaults_AddsDefaultProfileWhenRegistriesConfigured(t *testing.T) {
	registryPath := writeEngineProfileRegistry(t, `
slug: default
profiles:
  gpt-5-mini:
    slug: gpt-5-mini
    inference_settings:
      chat:
        api_type: openai
        engine: gpt-5-mini
`)

	parsed, err := geppettobootstrap.NewCLISelectionValues(appBootstrapConfig(), geppettobootstrap.CLISelectionInput{
		ProfileRegistries: []string{registryPath},
	})
	require.NoError(t, err)

	effective, err := applyApplicationProfileDefaults(parsed)
	require.NoError(t, err)

	selection, err := geppettobootstrap.ResolveCLIProfileSelection(appBootstrapConfig(), effective)
	require.NoError(t, err)
	require.Equal(t, defaultProfileSlug, selection.Profile)
	require.Equal(t, []string{registryPath}, selection.ProfileRegistries)
}

func TestApplyApplicationProfileDefaults_SkipsDefaultProfileWhenSlugMissing(t *testing.T) {
	registryPath := writeEngineProfileRegistry(t, `
slug: default
profiles:
  some-other-profile:
    slug: some-other-profile
    inference_settings:
      chat:
        api_type: openai
        engine: gpt-4o-mini
`)

	parsed, err := geppettobootstrap.NewCLISelectionValues(appBootstrapConfig(), geppettobootstrap.CLISelectionInput{
		ProfileRegistries: []string{registryPath},
	})
	require.NoError(t, err)

	effective, err := applyApplicationProfileDefaults(parsed)
	require.NoError(t, err)

	selection, err := geppettobootstrap.ResolveCLIProfileSelection(appBootstrapConfig(), effective)
	require.NoError(t, err)
	require.Empty(t, selection.Profile)
	require.Equal(t, []string{registryPath}, selection.ProfileRegistries)
}

func TestApplyApplicationProfileDefaults_DoesNotForceProfileWithoutRegistries(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", tmpDir)
	t.Setenv("HOME", tmpDir)

	parsed, err := geppettobootstrap.NewCLISelectionValues(appBootstrapConfig(), geppettobootstrap.CLISelectionInput{})
	require.NoError(t, err)

	effective, err := applyApplicationProfileDefaults(parsed)
	require.NoError(t, err)

	selection, err := geppettobootstrap.ResolveCLIProfileSelection(appBootstrapConfig(), effective)
	require.NoError(t, err)
	require.Empty(t, selection.Profile)
	require.Empty(t, selection.ProfileRegistries)
}

func TestResolveCLIProfileSelection_DefaultsToPinocchioProfilesRegistryWhenPresent(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", tmpDir)
	t.Setenv("HOME", tmpDir)

	registryPath := filepath.Join(tmpDir, "pinocchio", "profiles.yaml")
	require.NoError(t, os.MkdirAll(filepath.Dir(registryPath), 0o755))
	require.NoError(t, os.WriteFile(registryPath, []byte("slug: default\nprofiles:\n  gpt-5-mini:\n    slug: gpt-5-mini\n    inference_settings:\n      chat:\n        api_type: openai\n        engine: gpt-5-mini\n"), 0o644))

	selection, err := geppettobootstrap.ResolveCLIProfileSelection(appBootstrapConfig(), nil)
	require.NoError(t, err)
	require.Empty(t, selection.Profile)
	require.Equal(t, []string{registryPath}, selection.ProfileRegistries)
}

func TestApplyApplicationProfileDefaults_UsesPinocchioProfilesRegistryDefault(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", tmpDir)
	t.Setenv("HOME", tmpDir)

	registryPath := filepath.Join(tmpDir, "pinocchio", "profiles.yaml")
	require.NoError(t, os.MkdirAll(filepath.Dir(registryPath), 0o755))
	require.NoError(t, os.WriteFile(registryPath, []byte("slug: default\nprofiles:\n  gpt-5-mini:\n    slug: gpt-5-mini\n    inference_settings:\n      chat:\n        api_type: openai\n        engine: gpt-5-mini\n"), 0o644))

	parsed, err := geppettobootstrap.NewCLISelectionValues(appBootstrapConfig(), geppettobootstrap.CLISelectionInput{})
	require.NoError(t, err)

	effective, err := applyApplicationProfileDefaults(parsed)
	require.NoError(t, err)

	selection, err := geppettobootstrap.ResolveCLIProfileSelection(appBootstrapConfig(), effective)
	require.NoError(t, err)
	require.Equal(t, defaultProfileSlug, selection.Profile)
	require.Equal(t, []string{registryPath}, selection.ProfileRegistries)
}

func writeEngineProfileRegistry(t *testing.T, contents string) string {
	t.Helper()

	path := filepath.Join(t.TempDir(), "profiles.yaml")
	require.NoError(t, os.WriteFile(path, []byte(contents), 0o644))
	return path
}
