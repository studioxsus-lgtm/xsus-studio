# XSUS App V5.6 — Responsive & Accessibility QA

## Ndryshimet
- Përmirësime CSS për pesë dritaret modale: lartësi sipas ekranit (`dvh`), scrolling brenda dialogut dhe zona të sigurta për ekranet e telefonit.
- Konture të dukshme të fokusit për përdorimin me tastierë.
- Përmirësim i fallback-it të fokusit kur nuk ka kontrolle aktive në Project Manager dhe Testing & Diagnostics.
- Test statik i ri `tests/responsive-accessibility-v5-6.py`.

## Kufizimet
Kontrollet statike nuk provojnë sjelljen reale të modalëve në Android, me tastierë apo lexues ekrani. Nuk janë lidhur shërbime AI, databaza apo deployment.
