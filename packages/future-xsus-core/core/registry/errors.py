"""Registration conflicts and lookups for unknown engines or instances."""


class RegistrationConflict(ValueError):
    """An existing identity was registered with different data."""


class UnknownEngine(LookupError):
    """The referenced engine revision is not registered."""


class UnknownInstance(LookupError):
    """The referenced instance is not registered."""
