"""Conservative Markdown block boundaries with original character offsets."""

import re
from collections.abc import Iterator
from dataclasses import dataclass
from html.parser import HTMLParser

_FENCE = re.compile(r"^ {0,3}(?P<marker>`{3,}|~{3,})(?P<rest>.*)$")
_HTML_START = re.compile(r"^ {0,3}<(?P<tag>[A-Za-z][A-Za-z0-9:-]*)(?=[ \t>]|/>|$)", re.IGNORECASE)
_BLOCK_MARKUP = re.compile(
    r"^(?: {4}| {0,3}\t)|^ {0,3}(?:#{1,6}(?:[ \t]|$)|>|(?:[-+*]|[0-9]{1,9}[.)])(?:[ \t]|$)|<|\[[^\]]+\]:)"
    r"|^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|=+|-+)[ \t\r]*$",
    re.MULTILINE,
)
_INLINE_MARKUP = re.compile(r"[\x60*_<>\[\]|\\]|https?://|\bwww\.", re.IGNORECASE)
_VOID = frozenset({
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
})


class _HTMLRegion(HTMLParser):
    def __init__(self, tag: str) -> None:
        super().__init__(convert_charrefs=False)
        self.tag = tag.casefold()
        self.depth = 0
        self.started = False
        self.invalid = False

    def handle_starttag(self, tag, attrs):
        if tag == self.tag:
            self.started = True
            if tag not in _VOID:
                self.depth += 1

    def handle_startendtag(self, tag, attrs):
        if tag == self.tag:
            self.started = True

    def handle_endtag(self, tag):
        if tag == self.tag and self.depth:
            self.depth -= 1

    def closes_with(self, line: str) -> bool:
        if self.invalid:
            return False
        try:
            self.feed(line)
        except AssertionError:
            # Malformed HTML declarations can raise from the standard parser.
            # Keep the rest of an uncertain region protected.
            self.invalid = True
            return False
        return self.started and self.depth == 0



@dataclass(frozen=True, slots=True)
class MarkdownBlock:
    start: int
    end: int
    kind: str


def _prose_block(text: str, start: int, end: int) -> MarkdownBlock:
    body = text[start:end]
    kind = "markup" if _BLOCK_MARKUP.search(body) or _INLINE_MARKUP.search(body) else "prose"
    return MarkdownBlock(start, end, kind)


def markdown_blocks(text: str) -> Iterator[MarkdownBlock]:
    """Group prose, and protect syntax with ambiguous boundaries."""
    offset = 0
    prose_start = None
    protected_start = 0
    protected_kind = None
    close_pattern = None
    html_region = None
    for index, line in enumerate(text.splitlines(keepends=True)):
        start = offset
        offset += len(line)
        raw = line.rstrip("\r\n")
        if html_region is not None:
            if html_region.closes_with(line):
                yield MarkdownBlock(protected_start, offset, "html")
                html_region = None
            continue
        if close_pattern is not None:
            if close_pattern.search(raw):
                yield MarkdownBlock(protected_start, offset, protected_kind)
                close_pattern = None
            continue

        fence = _FENCE.fullmatch(raw)
        if fence is not None and fence["marker"][0] == "`" and "`" in fence["rest"]:
            fence = None
        html = _HTML_START.match(raw)
        delimiter = raw.removeprefix("\ufeff")
        if index == 0 and delimiter in {"---", "+++"}:
            protected_kind = "front_matter"
            close_pattern = re.compile(r"^(?:---|\.\.\.)[ \t]*$" if delimiter == "---" else r"^\+\+\+[ \t]*$")
        elif fence:
            marker = fence["marker"]
            protected_kind = "code"
            close_pattern = re.compile(r"^ {0,3}" + re.escape(marker[0]) + "{" + str(len(marker)) + r",}[ \t]*$")
        elif raw.lstrip(" ").startswith("<!--"):
            protected_kind = "html"
            close_pattern = re.compile("-->")
        elif html:
            protected_kind = "html"
            html_region = _HTMLRegion(html["tag"])
        else:
            if raw.strip():
                if prose_start is None:
                    prose_start = start
            elif prose_start is not None:
                yield _prose_block(text, prose_start, start)
                prose_start = None
            continue

        if prose_start is not None:
            yield _prose_block(text, prose_start, start)
            prose_start = None
        protected_start = start
        if html_region is not None and html_region.closes_with(line):
            yield MarkdownBlock(start, offset, "html")
            html_region = None
        elif close_pattern is not None and protected_kind == "html" and close_pattern.search(raw):
            yield MarkdownBlock(start, offset, "html")
            close_pattern = None

    if close_pattern is not None or html_region is not None:
        yield MarkdownBlock(protected_start, len(text), protected_kind)
    elif prose_start is not None:
        yield _prose_block(text, prose_start, len(text))
