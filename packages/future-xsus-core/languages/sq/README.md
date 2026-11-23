# XSUS Albanian Engine — stages 1–5

Independent foundation for written Standard Albanian, isolated from `languages/en`.

Implemented: NFC Unicode normalization and casefolding; tokenization that preserves Albanian diacritics and punctuation; 36-letter Albanian alphabet (including nine digraphs); a small explicitly tagged starter lexicon; conservative Albanian-language detection.

The detector returns `"sq"` only when a known Albanian marker is present, otherwise `None`. This is **not** a general multilingual classifier. The starter lexicon is not a morphological parser or conversational model. No automatic registration or production routing is enabled.

Run from `packages/future-xsus-core`:

```sh
python3 -m unittest discover -s languages/sq/tests -v
python3 -m unittest discover -s languages/en/tests -v
```

Next: expand annotated vocabulary, inflection and contextual disambiguation, add held-out evaluation and connect the engine through existing contracts only after acceptance tests.
