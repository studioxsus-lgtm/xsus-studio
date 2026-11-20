# Future XSUS Core — reference and ambiguity signals

Two isolated written-English diagnostics were added:

- `text/reference_signals_v6.py`: explicit pronoun/demonstrative cues,
  including occurrences in the opening sentence. Does not resolve
  pronouns to people or entities.
- `text/ambiguity_signals_v6.py`: explicit hedges, uncertainty modals
  and vague words. These are surface cues and may be used in
  non-ambiguous contexts; absence does not prove clarity.

Both modules reuse the conservative sentence segmentation layer and
its input limits. Neither module changes the public analysis API,
generation models, gateways, other language engines, or deployment.
They perform no external I/O.

Run `python3 -m unittest discover -s languages/en/tests -v` from the
`packages/future-xsus-core` directory to verify the new tests.
