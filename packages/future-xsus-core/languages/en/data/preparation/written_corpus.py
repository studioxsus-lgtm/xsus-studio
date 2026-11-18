"""Original short lessons and alternate training requests for written English."""

_LESSONS = (
    ("sentence fragments", "A sentence fragment is an incomplete sentence. Add the missing subject or verb, or join it to a complete sentence."),
    ("comma splices", "A comma splice joins two complete sentences with only a comma. Use a period, a semicolon, or a comma with a conjunction."),
    ("active voice", "In active voice, the subject performs the action. For example, Maya wrote the report."),
    ("passive voice", "In passive voice, the subject receives the action. For example, the report was written by Maya."),
    ("subject-verb agreement", "The verb must agree with its subject in person and number. Write the student reads, but the students read."),
    ("parallel structure", "Parallel structure uses the same grammatical form for related ideas. Write reading, writing, and editing."),
    ("topic sentences", "A topic sentence states the paragraph's main idea. The other sentences explain or support that idea."),
    ("concise writing", "Keep the meaning and remove words that add nothing. Write to instead of in order to."),
    ("formal tone", "A formal tone uses precise, respectful language. Avoid slang and choose words suited to your audience."),
    ("semicolons", "A semicolon can link two closely related independent clauses. Each clause could stand as a sentence."),
    ("possessive apostrophes", "Use an apostrophe to show possession. Write the student's book for one student and the students' books for several."),
    ("plain language", "Plain language helps readers understand and act. Use familiar words, short sentences, and clear instructions."),
)

_REQUESTS = (
    "Explain {topic}.",
    "Define {topic}.",
    "Describe {topic}.",
    "Summarize {topic}.",
    "Please explain {topic}.",
    "Teach me about {topic}.",
    "Help me understand {topic}.",
    "Give me an overview of {topic}.",
    "Give me the basics of {topic}.",
    "Tell me about {topic}.",
    "Can you explain {topic}?",
    "Could you describe {topic}?",
    "Would you summarize {topic}?",
    "What should I know about {topic}?",
    "I need a simple explanation of {topic}.",
    "I want help understanding {topic}.",
    "Give me a beginner's guide to {topic}.",
    "I want a brief introduction to {topic}.",
)


def build_written_rows() -> list[dict]:
    return [
        {"prompt": request.format(topic=topic), "response": answer}
        for topic, answer in _LESSONS
        for request in _REQUESTS
    ]
