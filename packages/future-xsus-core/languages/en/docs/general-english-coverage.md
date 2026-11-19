# General English Coverage — Lexicon v2

The written English clause analyzer uses a local, versioned vocabulary at
`languages/en/data/lexicon/general-v2.json`. The vocabulary currently contains
**342 count nouns, 35 mass nouns, 174 adjectives, 218 verbs, 20 determiners,
11 singular pronouns, and 64 adverbs**. Transitive verbs and agent nouns are
recorded separately so the parser can use them when identifying objects and
passive agents.

## Supported patterns

- Short declarative clauses with a recognized subject, finite verb, and
  optional direct object.
- Present and past forms, common irregular verb paradigms, and subject–verb
  agreement diagnostics.
- Basic auxiliary and modal questions, negation, perfect forms, and passive
  clauses with optional `by` agents.
- Adjective complements after common linking verbs and noun complements after
  `become`.
- A curated set of trailing adverbs and prepositional phrases after verbs,
  direct objects, and copular subjects.
- Two-part direct objects, prepositional objects, and passive agents joined by
  `and` or `or`, with conjuncts retained in the parsed phrase.
- Count and mass noun agreement, common determiners, singular indefinite
  pronouns, and targeted determiner-number diagnostics.

The authored evaluation set is `languages/en/evaluation/general-vocabulary-v2.jsonl`.
Run it from the package root with:

```sh
python3 -m languages.en.evaluation.general_english
```

Each expected result checks parsed grammatical roles rather than only whether
the sentence was accepted. Cases with `expected: null` check that unsupported
structures remain outside the parser's declared coverage.

## Current limits

This is a deterministic, local clause analyzer, not a complete English
grammar, dictionary, conversational model, or proof that a sentence is true.
It deliberately declines clauses it cannot parse unambiguously. Multi-clause
sentences, relative clauses, coordinated subjects and predicates, lists of
three or more items, fronted modifiers, complex prepositional phrases, and
stacked auxiliaries need separate grammar work.
The curated lexicon is broad enough to exercise common written clauses, but it
does not represent every English word, sense, inflection, or dialect.

## Adding vocabulary safely

Add words to the appropriate JSON category, keep each list unique, and include
transitive or agent-noun membership only when the grammatical role is valid.
The loader rejects duplicate entries, malformed words, unsupported schema
versions, inconsistent class membership, and verbs or nouns the morphology
module cannot inflect. Add evaluation cases for new vocabulary in more than one
syntactic role where possible. Increase the schema version when the data shape
changes; do not silently alter the meaning of an existing field.
