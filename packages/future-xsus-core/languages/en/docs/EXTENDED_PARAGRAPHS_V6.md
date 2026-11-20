# Extended English V6 — paragraph integration

The experimental opt-in `analyze_extended_v6` now includes
`paragraph_structure`, obtained from the independent
`analyze_paragraphs_v6` module.

The base V6 dictionary contract remains unchanged. The extension
is additive to the experimental extended response, not activated
in production gateways or XSUS App.

This layer measures explicit structure, not semantic quality or
document correctness. Run `python3 -m unittest discover -s languages/en/tests -v`
from `packages/future-xsus-core`.
