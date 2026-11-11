"""Small causal neural language model with explicit forward and SGD steps."""

from collections.abc import Sequence
from dataclasses import dataclass
from math import exp, log, sqrt, tanh
from random import Random


@dataclass(slots=True)
class NeuralLanguageModel:
    context_size: int
    embeddings: list[list[float]]
    hidden_bias: list[float]
    output_weights: list[list[float]]
    output_bias: list[float]

    @classmethod
    def initialize(
        cls, *, vocab_size: int, hidden_size: int, context_size: int, seed: int,
    ) -> "NeuralLanguageModel":
        if any(type(size) is not int or size < 1 for size in (vocab_size, hidden_size, context_size)):
            raise ValueError("Model dimensions must be positive integers")
        random = Random(seed)
        scale = 1 / sqrt(hidden_size)
        embeddings = [[random.uniform(-scale, scale) for _ in range(hidden_size)] for _ in range(vocab_size)]
        output_weights = [[random.uniform(-scale, scale) for _ in range(hidden_size)] for _ in range(vocab_size)]
        return cls(context_size, embeddings, [0.0] * hidden_size, output_weights, [0.0] * vocab_size)

    @property
    def vocab_size(self) -> int:
        return len(self.output_bias)

    def _forward(self, prefix: Sequence[int]) -> tuple[list[tuple[int, float]], list[float], list[float]]:
        positions = [(token, 1 / sqrt(age)) for age, token in enumerate(reversed(prefix[-self.context_size:]), 1)]
        hidden = self.hidden_bias.copy()
        for token, weight in positions:
            for column, value in enumerate(self.embeddings[token]):
                hidden[column] += weight * value
        hidden = [tanh(value) for value in hidden]
        logits = [
            bias + sum(weight * value for weight, value in zip(row, hidden))
            for row, bias in zip(self.output_weights, self.output_bias)
        ]
        return positions, hidden, logits

    def logits(self, prefix: Sequence[int]) -> list[float]:
        return self._forward(prefix)[2]

    def loss(self, prefix: Sequence[int], target: int) -> float:
        logits = self.logits(prefix)
        peak = max(logits)
        return peak + log(sum(exp(value - peak) for value in logits)) - logits[target]

    def train_step(self, prefix: Sequence[int], target: int, learning_rate: float) -> float:
        positions, hidden, logits = self._forward(prefix)
        peak = max(logits)
        probabilities = [exp(value - peak) for value in logits]
        denominator = sum(probabilities)
        loss = peak + log(denominator) - logits[target]
        hidden_gradient = [0.0] * len(hidden)
        for token, row in enumerate(self.output_weights):
            gradient = probabilities[token] / denominator - (token == target)
            step = learning_rate * gradient
            self.output_bias[token] -= step
            for column, value in enumerate(hidden):
                hidden_gradient[column] += gradient * row[column]
                row[column] -= step * value
        for column, value in enumerate(hidden):
            delta = learning_rate * hidden_gradient[column] * (1 - value * value)
            self.hidden_bias[column] -= delta
            for token, weight in positions:
                self.embeddings[token][column] -= delta * weight
        return loss
