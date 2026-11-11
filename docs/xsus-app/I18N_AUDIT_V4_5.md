# XSUS App V4.5 — Dynamic Translation Regression

## Ndryshimet
- Testing & Diagnostics: kërkimi tani pranon edhe emrat, kategoritë dhe statuset e përkthyera në gjuhën aktive.
- Testing & Diagnostics: statusi në panelin e detajeve shfaqet i përkthyer dhe tekstet dinamike të panelit kalojnë në HTML escaping.
- Notifications: njoftimi i dukshëm rifreskohet kur ndryshon gjuha, pa rinisur afatin e mbylljes.
- Shtuar `tests/xsus-app/i18n-dynamic-v4-5.py` për regresionet e këtyre sjelljeve dhe sintaksën e JavaScript.

## Kufizimet
- Testet janë statike; nuk verifikojnë funksionimin në Chromium, Firefox apo Android.
- Tekstet e futura nga përdoruesi dhe kodet nuk përkthehen automatikisht.
- Nuk është kryer certifikim gjuhësor për çdo frazë në kontekst.
- Asnjë ndryshim në GitHub ose integrim me motorët AI.
