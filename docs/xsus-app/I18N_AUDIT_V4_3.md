# XSUS App V4.3 — Audit i teksteve të paetiketuara

- Burimi: XSUS App V4.2, pa ndryshime në GitHub.
- U gjetën 38 fraza unike të dukshme në HTML që nuk kishin `data-i18n` (42 nyje tekstuale); u shtuan etiketa përkthimi.
- U përditësuan fjalorët EN/SQ/FR dhe u korrigjuan dy tituj të lënë në anglisht në shqip.
- Testi `tests/xsus-app/i18n-regression.py`: 400 çelësa të referuar të pranishëm në të tre fjalorët.
- Testi `tests/xsus-app/i18n-untagged-audit.py`: 0 nyje të dukshme të paetiketuara pas përjashtimit të markës, numrave dhe kodit shembull.
- Ky është audit i HTML statik; tekstet e gjeneruara nga JavaScript dhe cilësia gjuhësore kërkojnë kontroll të mëtejshëm.
- Testimi vizual dhe ndërrimi real i gjuhëve në telefon/shfletues: **nuk janë kryer**.
- Logoja dhe ndarja modulare ruhen; nuk ka integrime backend.

Për të ripërsëritur kontrollet: `python tests/xsus-app/i18n-regression.py` dhe `python tests/xsus-app/i18n-untagged-audit.py`.
