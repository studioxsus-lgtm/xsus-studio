"""Opt-in bounded explicit-frame evidence index for independent sentences.

Matches only the controlled subject/action/object triple. Does not infer
world truth, temporal scope, entailment or logical contradiction.
"""
from .sentence_batch_v1 import _validated_sentences
from .sentence_meaning_v1 import analyze_sentence_meaning

MAX_GROUPS = 32


def analyze_sentence_evidence(sentences: object) -> dict:
    items = _validated_sentences(sentences)
    groups: dict[tuple[str, str, str], dict] = {}
    unsupported = []
    for index, sentence in enumerate(items):
        frame = analyze_sentence_meaning(sentence)
        if frame.status != "resolved":
            unsupported.append(index)
            continue
        key = (frame.subject, frame.action, frame.object)
        if key not in groups:
            groups[key] = {"subject": frame.subject, "action": frame.action,
                           "object": frame.object, "positive_indices": [],
                           "negative_indices": []}
        groups[key][f"{frame.polarity}_indices"].append(index)
    output = []
    for group in groups.values():
        both = bool(group["positive_indices"] and group["negative_indices"])
        output.append({
            **group,
            "explicit_polarity_conflict": both,
            "world_contradiction_proven": False,
        })
    return {
        "contract": "future-xsus-core.sentence-evidence.v1",
        "total_sentences": len(items),
        "resolved_sentences": len(items) - len(unsupported),
        "abstained_indices": unsupported,
        "group_count": len(output),
        "groups": output,
        "explicit_polarity_conflict_groups": sum(
            group["explicit_polarity_conflict"] for group in output
        ),
        "production_authorized": False,
        "world_truth_verified": False,
        "temporal_scope_resolved": False,
        "cross_sentence_coreference_proven": False,
    }
