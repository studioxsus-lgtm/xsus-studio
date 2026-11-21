"""Direct grammar diagnostics for subject–verb and auxiliary forms."""
from dataclasses import dataclass
from ..text.grammar import check_grammar, IssueCode
from ..text.morphology import inflect_verb, VerbForm
from ..text.syntax import Clause, Phrase, Number, Auxiliary


@dataclass(frozen=True, slots=True)
class GrammarAgreementProbeV1:
    case_id: str
    subject: str
    person: int
    number: Number
    lemma: str
    verb: str
    expected_issue: str | None
    expected_suggestion: str | None
    auxiliary: str | None = None


ENGLISH_GRAMMAR_AGREEMENT_PROBES_V1 = (
    GrammarAgreementProbeV1("she-reads","she",3,Number.SINGULAR,"read","reads",None,None),
    GrammarAgreementProbeV1("she-read","she",3,Number.SINGULAR,"read","read","subject_verb_agreement","reads"),
    GrammarAgreementProbeV1("they-read","they",3,Number.PLURAL,"read","read",None,None),
    GrammarAgreementProbeV1("they-reads","they",3,Number.PLURAL,"read","reads","subject_verb_agreement","read"),
    GrammarAgreementProbeV1("he-writes","he",3,Number.SINGULAR,"write","writes",None,None),
    GrammarAgreementProbeV1("he-write","he",3,Number.SINGULAR,"write","write","subject_verb_agreement","writes"),
    GrammarAgreementProbeV1("we-write","we",1,Number.PLURAL,"write","write",None,None),
    GrammarAgreementProbeV1("we-writes","we",1,Number.PLURAL,"write","writes","subject_verb_agreement","write"),
    GrammarAgreementProbeV1("she-is","she",3,Number.SINGULAR,"be","is",None,None),
    GrammarAgreementProbeV1("she-are","she",3,Number.SINGULAR,"be","are","subject_verb_agreement","is"),
    GrammarAgreementProbeV1("they-are","they",3,Number.PLURAL,"be","are",None,None),
    GrammarAgreementProbeV1("they-is","they",3,Number.PLURAL,"be","is","subject_verb_agreement","are"),
)


def evaluate_grammar_agreement_direct_v1(
    probes=ENGLISH_GRAMMAR_AGREEMENT_PROBES_V1, *, min_cases=12, min_accuracy=1.0
):
    if (type(probes) not in (list,tuple) or not 1<=len(probes)<=10000
            or type(min_cases) is not int or min_cases<1
            or type(min_accuracy) not in (float,int) or not 0<=min_accuracy<=1):
        raise ValueError("Invalid probes or thresholds")
    seen=set()
    results=[]
    for probe in probes:
        if (not isinstance(probe,GrammarAgreementProbeV1)
                or type(probe.case_id) is not str or not probe.case_id
                or probe.case_id in seen or len(probe.case_id)>128
                or type(probe.subject) is not str or not probe.subject
                or type(probe.person) is not int or probe.person not in (1,2,3)
                or not isinstance(probe.number,Number)
                or type(probe.lemma) is not str or type(probe.verb) is not str
                or (probe.expected_issue is not None and type(probe.expected_issue) is not str)
                or (probe.expected_suggestion is not None and type(probe.expected_suggestion) is not str)
                or probe.auxiliary is not None):
            raise ValueError("Invalid or duplicate grammar probe")
        seen.add(probe.case_id)
        forms=frozenset(form for text,form in inflect_verb(probe.lemma).forms()
                        if text==probe.verb)
        if not forms:
            raise ValueError("Verb must be a known inflected form of its lemma")
        clause=Clause(
            subject=Phrase(probe.subject,probe.subject,probe.person,probe.number),
            verb=probe.verb,lemma=probe.lemma,forms=forms,
            object=None,complement=None,
        )
        issues=check_grammar(clause)
        observed=issues[0] if issues else None
        code=str(observed.code) if observed else None
        suggestion=observed.suggested if observed else None
        correct=(len(issues)<=1 and code==probe.expected_issue
                 and suggestion==probe.expected_suggestion)
        results.append({"case_id":probe.case_id,"expected_issue":probe.expected_issue,
                        "observed_issue":code,"expected_suggestion":probe.expected_suggestion,
                        "observed_suggestion":suggestion,"correct":correct})
    correct_count=sum(item["correct"] for item in results)
    return {
        "contract":"future-xsus-core.english-grammar-agreement-direct.v1",
        "case_count":len(results),"correct_count":correct_count,
        "accuracy":correct_count/len(results),"results":results,
        "passed":len(results)>=min_cases and correct_count/len(results)>=min_accuracy,
        "grammar_engine_called_directly":True,
        "syntax_parser_end_to_end_verified":False,
        "independent_holdout_proven":False,
        "release_authorized":False,
    }
