"""Map supported English conversation requests to reusable training prompts."""

import re

from core.contracts.request import Conversation

_OPENERS = (
    (r"(?:hi|hey|hello)(?: there)?[!,.]?(?: (?:are you (?:available|ready to help)|can (?:you help|we start))\?)?", "Greet the user."),
    (r"good (?P<period>morning|afternoon|evening)[!,.]?(?: (?:are you available|can we (?:begin|start))\?)?", "Greet the user this {period}."),
    (r"(?:many thanks|thanks|thank you)(?: (?:so much|a lot))?(?: for [a-z][a-z ,'-]*)?[!.]?", "Acknowledge the user's thanks."),
    (r"i appreciate (?:your (?:help|assistance|support)|what you did)[!.]?", "Acknowledge the user's thanks."),
    (r"(?:(?:could|can|would) you )?(?:please )?(?:write|draft) (?:a |an )?(?:(?:quick|short|brief) )?(?:thank-you (?:note|message)|(?:note|message) (?:of thanks|thanking [a-z][a-z '-]*))[.?!]?", "Write a brief thank-you note."),
)
_CLARIFY = re.compile(r"(?:(?:please )?clarify(?: this(?: message)?)?|(?:please )?make this clearer)\s*:\s*(.+)", re.IGNORECASE)
_AMBIGUITIES = (
    (re.compile(r"\b(?:soon|before long|as soon as possible|by then|due then)\b"), "Ask for the deadline."),
    (re.compile(r"\b(?:later|at some point|at the usual time)\b"), "Ask for the time."),
    (re.compile(r"\b(?:there|at the (?:usual|regular) (?:place|spot)|somewhere)\b"), "Ask for the location."),
    (re.compile(r"\b(?:ask|tell) them to send it\b"), "Ask who should send what."),
)
_REWRITE_ALIASES = (
    (re.compile(r"^(?:can|could|would) you (?:say|write|put) this in fewer words\?\s*", re.IGNORECASE), "Make this shorter: "),
    (re.compile(r"^(?:please )?(?:soften this(?: request)?|give this a warmer tone):\s*", re.IGNORECASE), "Make this warmer: "),
    (re.compile(r"^(?:please )?(?:make this sound (?:more )?(?:polite|courteous)|turn this into a polite request):\s*", re.IGNORECASE), "Make this polite: "),
)
_SHORTER_FOLLOWUP = re.compile(r"(?:can|could|would) you (?:say|write|put) (?:it|that) in fewer words\?", re.IGNORECASE)


def normalize_rewrite_alias(conversation: Conversation) -> Conversation:
    text = conversation.text.strip()
    if conversation.history and _SHORTER_FOLLOWUP.fullmatch(text):
        return Conversation("Make it shorter.", conversation.history)
    for pattern, command in _REWRITE_ALIASES:
        rewritten, changed = pattern.subn(command, text, count=1)
        if changed and rewritten.strip() != command.strip():
            return Conversation(rewritten, conversation.history)
    return conversation


def canonical_prompt(conversation: Conversation) -> Conversation:
    text = " ".join(conversation.text.strip().casefold().replace("’", "'").split())
    clarification = _CLARIFY.fullmatch(text)
    if clarification:
        message = clarification[1]
        matches = [prompt for marker, prompt in _AMBIGUITIES if marker.search(message)]
        # A task with competing ambiguities needs context outside these narrow intents.
        return Conversation(matches[0]) if len(matches) == 1 else conversation
    if conversation.history:
        return conversation
    for pattern, prompt in _OPENERS:
        match = re.fullmatch(pattern, text)
        if match:
            return Conversation(prompt.format(**match.groupdict()))
    return conversation
