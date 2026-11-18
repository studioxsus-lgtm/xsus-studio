"""Normalize explicit questions about written English for the v4 checkpoint."""

import re

from core.contracts.request import Conversation

_TOPICS = {
    "sentence-fragment": r"(?:sentence fragments?|incomplete sentences?)",
    "comma-splice": r"(?:comma splices?|joining clauses with a comma)",
    "active-voice": r"(?:active voice|writing in active voice)",
    "passive-voice": r"(?:passive voice|writing in passive voice)",
    "subject-agreement": r"(?:subject[ -]verb agreement|subject and verb agreement)",
    "parallel-structure": r"(?:parallel structure|parallelism|parallel wording)",
    "topic-sentence": r"(?:topic sentences?|paragraph topic sentences?)",
    "concise-prose": r"(?:concise writing|concise prose|writing concisely)",
    "formal-tone": r"(?:formal tone|formal writing tone|formal style)",
    "semicolon": r"(?:semicolons?|using semicolons?)",
    "possessive-apostrophe": r"(?:possessive apostrophes?|apostrophes? for possession)",
    "plain-language": r"(?:plain language|plain english|plain wording)",
}

# Match whole requests, so a prompt containing arbitrary prose or asking for
# several unrelated topics does not silently become a single lesson.
_REQUESTS = (
    r"(?:please )?(?:explain|define|describe|summarize|teach me about|help me understand|"
    r"give me an overview of|give me a quick guide to|give me a beginner's guide to|"
    r"give me the basics of|tell me about|show me the basics of) (?P<topic>.+)",
    r"(?:can|could|would) you (?:briefly )?(?:explain|define|describe|summarize|"
    r"help me understand|tell me about|give me the basics of) (?P<topic>.+)",
    r"(?:what is the basic idea behind|what do i need to know about|what should i know about|"
    r"what does a writer need to know about|what (?:is|are)) (?P<topic>.+)",
    r"(?:i need|i want|i'd like) (?:a simple explanation of|help understanding|"
    r"a brief introduction to) (?P<topic>.+)",
    r"(?P<topic>.+)[:,] (?:quick definition|basic explanation|in simple terms)",
)
_REQUEST_PATTERNS = tuple(re.compile(pattern) for pattern in _REQUESTS)
_TOPIC_PATTERNS = tuple((re.compile(pattern), topic) for topic, pattern in _TOPICS.items())


def canonical_written_prompt(conversation: Conversation) -> Conversation:
    text = " ".join(conversation.text.casefold().replace("’", "'").split()).rstrip(".?!")
    for pattern in _REQUEST_PATTERNS:
        request = pattern.fullmatch(text)
        if request is None:
            continue
        topic = re.sub(r"^(?:an?|the) ", "", request["topic"])
        for topic_pattern, label in _TOPIC_PATTERNS:
            if topic_pattern.fullmatch(topic):
                return Conversation(f"Explain writing lesson: {label}.")
    return conversation
