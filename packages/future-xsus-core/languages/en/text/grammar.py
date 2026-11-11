"""Check agreement and required verb forms in supported English clauses."""

from dataclasses import dataclass
from enum import StrEnum

from .morphology import VerbForm, inflect_verb
from .syntax import Clause, Number


class IssueCode(StrEnum):
    SUBJECT_VERB_AGREEMENT = "subject_verb_agreement"
    FINITE_VERB_REQUIRED = "finite_verb_required"
    AUXILIARY_VERB_FORM = "auxiliary_verb_form"
    PRONOUN_CASE = "pronoun_case"
    DETERMINER_NUMBER = "determiner_number"


@dataclass(frozen=True, slots=True)
class GrammarIssue:
    code: IssueCode
    observed: str
    suggested: str | None


_PRESENT = frozenset({VerbForm.BASE, VerbForm.THIRD_PERSON, VerbForm.FIRST_PERSON, VerbForm.NON_THIRD_PRESENT})
_PAST = frozenset({VerbForm.PAST, VerbForm.NON_SINGULAR_PAST})
_AUXILIARY_FORMS = {"do": VerbForm.BASE, "have": VerbForm.PAST_PARTICIPLE, "be": VerbForm.PRESENT_PARTICIPLE}
_SUBJECT_PRONOUNS = {"me": "I", "him": "he", "her": "she", "us": "we", "them": "they"}
_OBJECT_PRONOUNS = {subject.lower(): object_ for object_, subject in _SUBJECT_PRONOUNS.items()}
_DEMONSTRATIVES = {
    "this": (Number.SINGULAR, "these"), "that": (Number.SINGULAR, "those"),
    "these": (Number.PLURAL, "this"), "those": (Number.PLURAL, "that"),
}


def _verb_issue(clause: Clause) -> GrammarIssue | None:
    auxiliary = clause.auxiliary
    verb = auxiliary.text if auxiliary else clause.verb
    lemma = auxiliary.lemma if auxiliary else clause.lemma
    forms = auxiliary.forms if auxiliary else clause.forms
    observed = verb.lower()
    subject = clause.subject
    if (lemma == "be" and observed == "be") or not forms & (_PRESENT | _PAST):
        return GrammarIssue(IssueCode.FINITE_VERB_REQUIRED, verb, None)
    if subject.number is None and subject.person != 2:
        return None
    singular = subject.number is Number.SINGULAR
    if lemma == "be":
        if forms & _PAST:
            expected = "was" if singular and subject.person != 2 else "were"
        elif singular and subject.person == 1:
            expected = "am"
        else:
            expected = "is" if singular and subject.person == 3 else "are"
    elif forms & _PAST:
        return None
    else:
        inflection = inflect_verb(lemma)
        expected = inflection.third_person if singular and subject.person == 3 else inflection.base
    if observed == expected:
        return None
    return GrammarIssue(IssueCode.SUBJECT_VERB_AGREEMENT, verb, expected)


def check_grammar(clause: Clause) -> tuple[GrammarIssue, ...]:
    """Report diagnostics when the supported clause supplies enough evidence."""
    issues = []
    if (verb_issue := _verb_issue(clause)) is not None:
        issues.append(verb_issue)
    if clause.auxiliary is not None:
        required = _AUXILIARY_FORMS[clause.auxiliary.lemma]
        if required not in clause.forms:
            expected = getattr(inflect_verb(clause.lemma), required.value)
            issues.append(GrammarIssue(IssueCode.AUXILIARY_VERB_FORM, clause.verb, expected))
    for phrase, pronouns in (
        (clause.subject, _SUBJECT_PRONOUNS), (clause.object, _OBJECT_PRONOUNS),
    ):
        if phrase is None:
            continue
        words = phrase.text.lower().split()
        if len(words) == 1 and words[0] in pronouns:
            issues.append(GrammarIssue(IssueCode.PRONOUN_CASE, phrase.text, pronouns[words[0]]))
        if len(words) > 1 and phrase.number is not None:
            first = words[0]
            if first in _DEMONSTRATIVES:
                expected, replacement = _DEMONSTRATIVES[first]
                if phrase.number != expected:
                    issues.append(GrammarIssue(IssueCode.DETERMINER_NUMBER, first, replacement))
            elif first in {"a", "an"} and phrase.number is Number.PLURAL:
                issues.append(GrammarIssue(IssueCode.DETERMINER_NUMBER, first, None))
    return tuple(issues)
