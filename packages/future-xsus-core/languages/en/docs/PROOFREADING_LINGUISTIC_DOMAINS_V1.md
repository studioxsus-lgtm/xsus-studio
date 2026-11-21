# English Proofreading Linguistic Domains V1

Aggregate verified category-quality metrics into four evaluation
domains: grammar, morphology, syntax, and correct-text preservation.
Require exact assignment coverage and apply per-domain minimum
case counts, accuracy and regression thresholds. All constituent
categories must pass before aggregation.

**Important limits:** This aggregates proofreading evaluation
categories; it does not execute independent morphology or syntax
engines or establish their production readiness. Domain assignments
are caller-supplied and not signed by this function. Upstream
authentication flags must come from a trusted execution context;
this adapter does not independently reverify HMACs. A passing score
on a small fixture does not establish general language competence.
No automatic training, promotion, deployment or release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_linguistic_domains_v1 -v`
