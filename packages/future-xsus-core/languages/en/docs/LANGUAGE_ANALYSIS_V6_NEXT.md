# Future XSUS Core — English discourse and argument signals (V6)

These two standalone, opt-in modules expand written-English analysis:

- `text/discourse_v6.py`: explicit discourse cues, adjacent shared
  lexical terms, and segmentation uncertainty.
- `text/argument_signals_v6.py`: explicit premise, conclusion,
  qualification, and evidence markers.

Both use the existing conservative sentence segmentation contract.
They do not modify the public V6 analysis API, model weights, gateway,
XSUS App, Hyper XSUS Core, or main. There is no external I/O.

**Interpretation boundaries:** lexical overlap is not proof of
coherence. A marker such as 'therefore' does not establish a valid
inference. 'According to' does not verify a source. Unsupported or
ambiguous language may not be recognized. This is a surface analysis
layer, not open-domain reasoning.

Verification: `python3 -m unittest discover -s languages/en/tests -v`.
