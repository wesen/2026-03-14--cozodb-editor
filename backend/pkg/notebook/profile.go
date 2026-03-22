package notebook

type StarterCellTemplate struct {
	Kind   string
	Source string
}

type NotebookProfile struct {
	DefaultLanguage      string
	DefaultNotebookTitle string
	StarterCells         []StarterCellTemplate
}

func DefaultNotebookProfile() NotebookProfile {
	return NotebookProfile{
		DefaultLanguage:      "notebook",
		DefaultNotebookTitle: "Notebook",
		StarterCells: []StarterCellTemplate{
			{
				Kind:   "markdown",
				Source: "## Notebook\n\nWrite notes or code in the cells below.",
			},
			{
				Kind:   "code",
				Source: "",
			},
		},
	}
}

func (p NotebookProfile) withDefaults() NotebookProfile {
	defaults := DefaultNotebookProfile()
	if p.DefaultLanguage == "" {
		p.DefaultLanguage = defaults.DefaultLanguage
	}
	if p.DefaultNotebookTitle == "" {
		p.DefaultNotebookTitle = defaults.DefaultNotebookTitle
	}
	if len(p.StarterCells) == 0 {
		p.StarterCells = defaults.StarterCells
	}
	return p
}
