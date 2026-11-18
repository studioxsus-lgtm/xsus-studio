"""Optional NumPy implementation of the same per-token SGD update."""

import numpy as np


class VectorizedTrainer:
    def __init__(self, model):
        self.context_size = model.context_size
        self.embeddings = np.array(model.embeddings, dtype=np.float64)
        self.hidden_bias = np.array(model.hidden_bias, dtype=np.float64)
        self.output_weights = np.array(model.output_weights, dtype=np.float64)
        self.output_bias = np.array(model.output_bias, dtype=np.float64)
        self.position_weights = 1 / np.sqrt(np.arange(1, self.context_size + 1))

    def train_step(self, prefix, target, learning_rate):
        tokens = prefix[-self.context_size:][::-1]
        weights = self.position_weights[:len(tokens)]
        hidden = np.tanh(self.hidden_bias + weights @ self.embeddings[tokens])
        logits = self.output_weights @ hidden + self.output_bias
        probabilities = np.exp(logits - logits.max())
        probabilities /= probabilities.sum()
        probabilities[target] -= 1
        delta = learning_rate * (probabilities @ self.output_weights) * (1 - hidden * hidden)
        self.output_weights -= learning_rate * probabilities[:, None] * hidden
        self.output_bias -= learning_rate * probabilities
        self.hidden_bias -= delta
        # A token can appear at several positions in one context.
        np.add.at(self.embeddings, tokens, -weights[:, None] * delta)

    def copy_to(self, model):
        model.embeddings = self.embeddings.tolist()
        model.hidden_bias = self.hidden_bias.tolist()
        model.output_weights = self.output_weights.tolist()
        model.output_bias = self.output_bias.tolist()
