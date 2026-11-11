# XSUS App V4.0 — Dynamic UI translation audit

Scope: Project Manager, Version History, Testing & Diagnostics, Publishing.

- Added 106 explicit English-to-Albanian/French translation pairs for demo labels, messages, statuses and content.
- Dynamic panels use `t()` and `formatUi()` rather than trying to translate user-entered text.
- Project Manager, Version History and Testing panels re-render on `xsus:language-changed`.
- Publishing preview translates generated labels when the preview action is triggered. An already generated preview must be regenerated after switching language.
- Settings remains mostly static and uses existing `data-i18n` tags.
- Template prompts stay in English intentionally as user-editable AI instructions; no backend AI is connected.
- This is a code-level check, NOT an end-to-end browser certification or 100% translation guarantee.
