# Future XSUS Core

Future XSUS Core is the language and speech engine for XSUS Studio. English (`en`) is the baseline. The `languages/` directory is the catalog of language packs. Albanian (`sq`) and French (`fr`) are the next planned development milestones. The other profiles record languages for future expansion. The future knowledge core supplies factual information through a separate interface.

Each language owns its profile, language-specific rules, and speech configuration under `languages/<tag>/`. The shared engine will load the selected language pack through a common contract. See [Language packs](docs/add-a-language.md) for the layout and status rules.

The current package defines the folder layout and language profiles. The model runtime, training, and speech engines are future milestones.
