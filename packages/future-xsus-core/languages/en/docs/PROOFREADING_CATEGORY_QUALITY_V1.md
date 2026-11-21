# English Proofreading Category Quality V1

Assess the verified snapshot comparison by labeled categories (e.g.,
subject-verb agreement, correct-text preservation). Require exact
case-ID coverage and configurable per-category minimum case counts,
accuracy thresholds and regression ceilings. A single weak category
can fail the aggregate gate even when overall accuracy is high.

**Limitations:** Category labels are supplied separately and are not
authenticated by this function. The comparison report is accepted
by its shape and flags, not cryptographically reverified here;
callers must keep the verified report in a trusted process.
This does not prove broad linguistic generalization, and it never
authorizes training, release, promotion or deployment.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_category_quality_v1 -v`
