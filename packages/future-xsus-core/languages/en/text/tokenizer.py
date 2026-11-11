"""XSUS byte-pair tokenizer, fitted on the English training corpus."""

from collections import Counter
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field

BOS, EOS, USER, ASSISTANT = range(4)
BYTE_OFFSET = 4
BASE_VOCAB_SIZE = BYTE_OFFSET + 256


def _merge(tokens: Sequence[int], pair: tuple[int, int], replacement: int) -> list[int]:
    merged: list[int] = []
    index = 0
    while index < len(tokens):
        if index + 1 < len(tokens) and tokens[index] == pair[0] and tokens[index + 1] == pair[1]:
            merged.append(replacement)
            index += 2
        else:
            merged.append(tokens[index])
            index += 1
    return merged


@dataclass(frozen=True, slots=True)
class BytePairTokenizer:
    merges: tuple[tuple[int, int], ...] = ()
    _pieces: tuple[bytes, ...] = field(init=False, repr=False, compare=False)

    def __post_init__(self) -> None:
        pieces = [b""] * BYTE_OFFSET + [bytes((value,)) for value in range(256)]
        seen: set[tuple[int, int]] = set()
        for pair in self.merges:
            if len(pair) != 2 or any(type(token) is not int or not BYTE_OFFSET <= token < len(pieces) for token in pair):
                raise ValueError("Invalid tokenizer merge")
            if pair in seen:
                raise ValueError("Duplicate tokenizer merge")
            seen.add(pair)
            pieces.append(pieces[pair[0]] + pieces[pair[1]])
        object.__setattr__(self, "_pieces", tuple(pieces))

    @property
    def vocab_size(self) -> int:
        return len(self._pieces)

    @classmethod
    def train(cls, texts: Iterable[str], *, max_merges: int) -> "BytePairTokenizer":
        if type(max_merges) is not int or max_merges < 0:
            raise ValueError("max_merges must be a nonnegative integer")
        sequences = [[byte + BYTE_OFFSET for byte in text.encode("utf-8")] for text in texts]
        merges: list[tuple[int, int]] = []
        for _ in range(max_merges):
            frequencies = Counter(pair for tokens in sequences for pair in zip(tokens, tokens[1:]))
            if not frequencies:
                break
            pair = min(frequencies, key=lambda candidate: (-frequencies[candidate], candidate))
            if frequencies[pair] < 2:
                break
            token = BASE_VOCAB_SIZE + len(merges)
            sequences = [_merge(tokens, pair, token) for tokens in sequences]
            merges.append(pair)
        return cls(tuple(merges))

    def encode(self, text: str) -> list[int]:
        tokens = [byte + BYTE_OFFSET for byte in text.encode("utf-8")]
        for token, pair in enumerate(self.merges, start=BASE_VOCAB_SIZE):
            tokens = _merge(tokens, pair, token)
        return tokens

    def decode(self, tokens: Iterable[int], *, errors: str = "strict") -> str:
        parts: list[bytes] = []
        for token in tokens:
            if type(token) is not int or not 0 <= token < self.vocab_size:
                raise ValueError("Token is outside the tokenizer vocabulary")
            parts.append(self._pieces[token])
        return b"".join(parts).decode("utf-8", errors=errors)
