# Future XSUS Core — reproducible document-signal benchmark

The opt-in `evaluate_documents_v6` function scores four **explicit**
document signals against a small, fixed gold-label set:

1. paragraph count,
2. heuristic sentence count,
3. presence of an explicit contrast cue,
4. presence of an explicit reference cue.

It returns per-field and overall exact-match accuracy plus detailed
case-level failures. The benchmark includes eight simple labeled
examples; **a perfect score does not establish general language
understanding, paragraph coherence, coreference resolution or
real-world accuracy**. These examples are not an independent
representative test corpus. Expand with diverse independently labeled
data and error analysis before making quality claims.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_document_benchmark_v6 -v`.
