# Shërbimi i motorit gjuhësor

`worker.py` ekspozon një instancë të motorit me `POST /v1/execute`. Shërbimi merr motorin nga një funksion fabrike pa argumente që kthen një objekt sipas kontratës `LanguageEngine`. Regjistri, drejtuesi dhe rregullat e riprovimit përdoren nga bërthama që thërret shërbimin.

## Nisja

Nga rrënja e Future XSUS Core, instalo varësinë me `python3 -m pip install -r requirements-remote.txt`. Vendos tokenin e shërbimit në variablën `XSUS_ENGINE_WORKER_TOKEN` dhe përdor modulin e motorit që dëshiron të ngarkosh.

```sh
PYTHONPATH=. python3 services/engine-worker/worker.py --engine my_engine:create_engine
```

Parazgjedhja është `127.0.0.1:8081`. Për të dëgjuar në një adresë të arritshme nga serverë të tjerë, jep `--host`, `--tls-cert` dhe `--tls-key`. Përdor tokenin e të njëjtit shërbim në konfigurimin e klientit. Tokeni nuk është pjesë e kodit ose e deklaratës së motorit.

Në bërthamë, regjistro deklaratën dhe instancën dhe lidhe identitetin e saktë të instancës me një `WorkerEndpoint(origin, token)`. Jep një `aiohttp.ClientSession` të ripërdorshme dhe këtë hartë te `RemoteEngineTransport`. Nga ai çast, `RequestExecutor` mund të përdorë këtë transport për të thirrur motorin. `origin` përmban skemën, hostin dhe portën. HTTP lejohet për adresa IP lokale loopback. Për adresat e tjera përdoret HTTPS.

## Kërkesat dhe dështimet

- Trupi është JSON në UTF-8. Audioja dërgohet në Base64. Kufiri fillestar është 8 MiB për trupin e koduar të kërkesës ose përgjigjes.
- Shërbimi kontrollon tokenin, identitetin e instancës, aftësinë dhe afatin përpara se të thërrasë motorin. Përgjigjja ruan identifikuesin e kërkesës dhe të përpjekjes.
- Mbingarkesa, mungesa e lidhjes dhe skadimi i përpjekjes mund të çojnë te një instancë tjetër e të njëjtit motor dhe revizion. Përgjigjet e pavlefshme dhe gabimet e autentikimit janë përfundimtare për kërkesën.
- Nisja standarde anulon trajtuesin kur klienti shkëputet. Përpunimi i motorit duhet të bashkëpunojë me anulimin. Afati i kërkesës dhe kufiri lokal prej 30 sekondash vlejnë edhe në shërbim.
