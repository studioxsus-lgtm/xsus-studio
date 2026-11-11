# Future XSUS Core

Future XSUS Core is the language and speech engine for XSUS Studio. English (`en`) is the baseline. The `languages/` directory is the catalog of language packs. Albanian (`sq`) and French (`fr`) are the next planned development milestones. The other profiles record languages for future expansion. The future knowledge core supplies factual information through a separate interface.

Each language owns its profile, language-specific rules, and speech configuration under `languages/<tag>/`. The shared engine will load the selected language pack through a common contract. See [Language packs](docs/add-a-language.md) for the layout and status rules.

## Text conversation foundation

The Python package loads the language catalog and assembles a model request from the selected language's instructions, the conversation history, and the new message. English text support is in development. The caller supplies the model implementation and the path to the language packs. Model training, an actual local inference adapter, translation, and speech remain future milestones.

| Path | Responsibility |
| --- | --- |
| `src/future_xsus_core/language.py` | Load and validate each language profile |
| `src/future_xsus_core/conversation.py` | Prepare the conversation and call the model |
| `src/future_xsus_core/runtime.py` | Define the message and model contracts |
| `languages/en/text/response-style.md` | English conversation instructions |

Use Python 3.11 or newer. From this package directory, run:

```sh
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

The tests use a recording model to verify that the conversation engine forwards the selected language and history. Model quality must be evaluated with a real model.
