"""Phase 3.4 explicit role evidence grouping without entity coreference."""
from .role_batch_v1 import _validate_sentences
from .role_semantics_v1 import classify_sentence_roles


def group_role_evidence(sentences: list[str] | tuple[str, ...]) -> dict:
    items = _validate_sentences(sentences)
    groups = {}
    abstained = []
    for index, sentence in enumerate(items):
        frame = classify_sentence_roles(sentence)
        if frame.status != "resolved":
            abstained.append(index)
            continue
        key = (frame.subject, frame.action, frame.object)
        group = groups.setdefault(key, {"positive": [], "negative": []})
        group[frame.polarity].append(index)
    entries = []
    for (subject, action, obj), polarities in sorted(groups.items()):
        positive = tuple(polarities["positive"])
        negative = tuple(polarities["negative"])
        entries.append({
            "subject": subject, "action": action, "object": obj,
            "positive_indices": positive, "negative_indices": negative,
            "explicit_polarity_difference": bool(positive and negative),
        })
    return {
        "contract": "future-xsus-core.role-evidence.v1",
        "total": len(items), "groups": tuple(entries),
        "abstained_indices": tuple(abstained),
        "raw_text_exposed": False,
        "event_identity_proven": False,
        "logical_contradiction_proven": False,
        "production_authorized": False,
    }
