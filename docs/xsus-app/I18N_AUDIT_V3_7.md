# XSUS App V3.7 — Dynamic UI localization audit

- Added a controlled text-node translation pass for dynamic UI within Chat, Projects, History, Testing, Publishing, Settings and toasts.
- Added 30+ targeted dynamic interface translations in Albanian and French.
- Preserved user-entered input, chat message bodies, code, preformatted text and project names/descriptions without automatic translation.
- Language switching updates tagged static content and supported dynamic labels.
- Reworded Settings guidance to reflect partial localization honestly.

## Known limitations
- Dynamic text containing interpolated values and several longer mock data descriptions remain in English.
- Static source audit does not establish native-quality translations.
- No real-browser functional/visual verification performed.
- This is a frontend prototype; no backend, AI service or publishing connection.
