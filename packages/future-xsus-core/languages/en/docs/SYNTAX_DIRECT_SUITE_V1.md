# English Syntax Direct Suite V1

Calls the existing `text.syntax.analyze_clause` parser directly.
Twelve visible probes cover declarative statements, positive
imperatives, and unsupported input formats. Reports parser
acceptance versus explicit expectations by phenomenon.

**Limitations:** Parseability is not grammatical correctness.
A parser can accept an ungrammatical sentence, reject a grammatical
sentence, or produce an incorrect interpretation. These fixtures
are not a blind holdout and do not demonstrate general competence.
No training, model release or deployment.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_syntax_direct_suite_v1 -v`
