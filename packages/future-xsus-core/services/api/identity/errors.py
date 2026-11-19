"""Errors raised when an external identity provider cannot be reached safely."""


class IdentityProviderUnavailable(RuntimeError):
    """The configured provider could not verify the supplied bearer token."""
