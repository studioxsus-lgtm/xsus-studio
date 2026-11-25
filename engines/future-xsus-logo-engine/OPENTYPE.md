# OpenType provider
Compatible with preloaded OpenType.js font objects. The provider maps real font path commands, centers by advance width, requests kerning and rejects missing glyphs. No parser dependency or licensed font is bundled; caller must supply parsed fonts. Tests use fixtures, not actual font files. Complex shaping and paths over 512 commands remain unsupported. No font embedding.
