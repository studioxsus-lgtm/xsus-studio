# Future XSUS Core

Future XSUS Core is the language and speech engine for XSUS Studio. English (`en`) is the baseline. Albanian (`sq`) and French (`fr`) are planned language packs. The future knowledge core supplies factual information through a separate interface.

Each language owns its profile, language-specific rules, and speech configuration under `languages/<tag>/`. The shared engine will load the selected language pack through a common contract. See [Language packs](docs/add-a-language.md) for the layout and status rules.

This commit establishes the folder layout and language profiles. The model runtime, training, and speech engines are future milestones.
