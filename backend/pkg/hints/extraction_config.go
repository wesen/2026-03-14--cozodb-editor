package hints

import (
	_ "embed"
	"fmt"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"
)

//go:embed extraction_config.yaml
var extractionConfigYAML []byte

type ExtractionConfig struct {
	Package  string                 `yaml:"package"`
	Version  string                 `yaml:"version"`
	Families []ExtractionFamilySpec `yaml:"families"`
}

type ExtractionFamilySpec struct {
	Type        string   `yaml:"type"`
	Required    bool     `yaml:"required"`
	Description string   `yaml:"description"`
	Fields      []string `yaml:"fields"`
	YAMLExample string   `yaml:"yaml_example"`
}

var (
	extractionConfigOnce sync.Once
	extractionConfig     *ExtractionConfig
	extractionConfigErr  error
)

func LoadExtractionConfig() (*ExtractionConfig, error) {
	extractionConfigOnce.Do(func() {
		var cfg ExtractionConfig
		extractionConfigErr = yaml.Unmarshal(extractionConfigYAML, &cfg)
		if extractionConfigErr != nil {
			extractionConfigErr = fmt.Errorf("unmarshal extraction config: %w", extractionConfigErr)
			return
		}
		extractionConfig = &cfg
	})
	if extractionConfigErr != nil {
		return nil, extractionConfigErr
	}
	return extractionConfig, nil
}

func renderExtractionInstructions() string {
	cfg, err := LoadExtractionConfig()
	if err != nil || cfg == nil {
		return ""
	}

	var b strings.Builder
	b.WriteString("## Structured Output Format\n")
	b.WriteString("After the visible explanation, emit YAML payload blocks wrapped in tags.\n")
	b.WriteString("Do not emit JSON. The tags are hidden from the user and used for extraction.\n\n")
	for _, family := range cfg.Families {
		b.WriteString(fmt.Sprintf("- Tag: <%s:%s:%s> ... </%s:%s:%s>\n", cfg.Package, family.Type, cfg.Version, cfg.Package, family.Type, cfg.Version))
		if family.Description != "" {
			b.WriteString(fmt.Sprintf("  Purpose: %s\n", family.Description))
		}
		if len(family.Fields) > 0 {
			b.WriteString(fmt.Sprintf("  Fields: %s\n", strings.Join(family.Fields, ", ")))
		}
		if family.Required {
			b.WriteString("  Requirement: at least one block is required.\n")
		}
		if strings.TrimSpace(family.YAMLExample) != "" {
			b.WriteString("  Example:\n")
			for _, line := range strings.Split(strings.TrimSpace(family.YAMLExample), "\n") {
				b.WriteString("    " + line + "\n")
			}
		}
	}
	b.WriteString("\nRules:\n")
	b.WriteString("- Emit exactly one primary hint block.\n")
	b.WriteString("- Emit 2-4 query suggestion blocks when you can offer concrete next steps.\n")
	b.WriteString("- Emit 1-2 doc ref blocks for the most relevant concepts.\n")
	b.WriteString("- Keep YAML valid and do not wrap the YAML in markdown fences.\n")
	return strings.TrimSpace(b.String())
}
