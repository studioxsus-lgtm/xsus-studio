"""Persist a versioned XSUS tokenizer and model in a portable checkpoint."""

import gzip
import hashlib
import json
import math
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

from ..text.tokenizer import BytePairTokenizer
from .neural_model import NeuralLanguageModel

_FORMAT = "xsus-en-neural-lm-v1"


def save_checkpoint(path: Path, tokenizer: BytePairTokenizer, model: NeuralLanguageModel) -> None:
    if tokenizer.vocab_size != model.vocab_size:
        raise ValueError("Tokenizer vocabulary and model dimensions differ")
    raw = json.dumps({
        "format": _FORMAT,
        "merges": tokenizer.merges,
        "context_size": model.context_size,
        "embeddings": [[round(value, 8) for value in row] for row in model.embeddings],
        "hidden_bias": [round(value, 8) for value in model.hidden_bias],
        "output_weights": [[round(value, 8) for value in row] for row in model.output_weights],
        "output_bias": [round(value, 8) for value in model.output_bias],
    }, separators=(",", ":"), allow_nan=False).encode("utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
        temp_path = Path(temporary.name)
        try:
            temporary.write(gzip.compress(raw, mtime=0))
            temporary.close()
            os.replace(temp_path, path)
        finally:
            temp_path.unlink(missing_ok=True)


def _vector(value: object, size: int) -> list[float]:
    if not isinstance(value, list) or len(value) != size:
        raise ValueError("Checkpoint vector dimensions do not match")
    if any(type(number) not in (int, float) or not math.isfinite(number) for number in value):
        raise ValueError("Checkpoint weights must be finite numbers")
    return [float(number) for number in value]


def load_checkpoint(path: Path) -> tuple[BytePairTokenizer, NeuralLanguageModel, str]:
    compressed = path.read_bytes()
    try:
        data = json.loads(gzip.decompress(compressed))
        if not isinstance(data, dict) or data.get("format") != _FORMAT:
            raise ValueError("Unsupported checkpoint format")
        tokenizer = BytePairTokenizer(tuple(tuple(pair) for pair in data["merges"]))
        context_size = data["context_size"]
        hidden = data["hidden_bias"]
        if type(context_size) is not int or context_size < 1 or not isinstance(hidden, list) or not hidden:
            raise ValueError("Invalid checkpoint model dimensions")
        hidden_size = len(hidden)
        vocabulary = tokenizer.vocab_size
        matrices = [data["embeddings"], data["output_weights"]]
        if any(not isinstance(matrix, list) or len(matrix) != vocabulary for matrix in matrices):
            raise ValueError("Checkpoint matrices do not match the tokenizer vocabulary")
        embeddings, output_weights = [[_vector(row, hidden_size) for row in matrix] for matrix in matrices]
        model = NeuralLanguageModel(
            context_size, embeddings, _vector(hidden, hidden_size), output_weights,
            _vector(data["output_bias"], vocabulary),
        )
    except (EOFError, OSError, KeyError, TypeError, OverflowError, ValueError) as error:
        raise ValueError(f"Invalid XSUS checkpoint: {path}") from error
    return tokenizer, model, "sha256-" + hashlib.sha256(compressed).hexdigest()
