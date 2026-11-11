# Language packs

Use a directory named for the language's primary BCP 47 subtag. For example, English is `en`, Albanian is `sq`, and French is `fr`. Regional variants stay inside their parent language pack.

| Path | Contents |
| --- | --- |
| `languages/<tag>/language.toml` | Language identity, roadmap status, and independent status for text, recognition, and synthesis |
| `languages/<tag>/text/` | Text normalization, response style, and language-specific examples |
| `languages/<tag>/speech/recognition/` | Language-specific transcription configuration |
| `languages/<tag>/speech/synthesis/` | Language-specific pronunciation and voice configuration |
| `data/manifests/<tag>/` | Versioned source manifests and licenses for language data |
| `evaluation/benchmarks/<tag>/text/` | Held-out tests for understanding and response quality |
| `evaluation/benchmarks/<tag>/speech/` | Held-out tests for transcription and pronunciation |

Create the language profile first. The profile's `stage` is `baseline` for English and `planned` for reserved packs. This describes development order. Each capability starts as `planned`, moves to `in-development` with its implementation, and becomes `verified` after evaluation. An application should advertise a capability only when the selected language has verified it.

Add each subdirectory with its first real file. Keep examples, rules, and speech settings in the pack they belong to. Put reusable interfaces and engine code in `src/future_xsus_core/`. Keep held-out evaluation data separate from training data.
