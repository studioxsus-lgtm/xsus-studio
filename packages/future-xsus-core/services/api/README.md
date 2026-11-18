# API-ja lokale e Future XSUS Core

API-ja lidh klientët HTTP me bërthamën e bisedave, motorin e anglishtes dhe
sesionet në SQLite. Nisja nga komanda pranon adresat lokale `127.0.0.1` dhe
`::1`. Një token i vetëm përfaqëson pronarin e konfiguruar të sesioneve.

Nga `packages/future-xsus-core/`:

```sh
python3 -m pip install -r requirements-remote.txt
export XSUS_API_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
export XSUS_EN_MODEL_PROFILE=conversation-v3
python3 -m services.api.server --database conversation.db --port 8080
```

Mbaje tokenin e klientit të njëjtë me atë të procesit të serverit. Ruaje
skedarin e databazës në një dosje ku përdoruesit e autorizuar kanë qasje.
`XSUS_API_OWNER` cakton pronarin, me vlerë fillestare `local-api`.
Mbaje këtë identitet të qëndrueshëm kur rinis serverin me të njëjtën databazë.

| Metoda dhe rruga | Funksioni |
| --- | --- |
| `GET /healthz` | Kontrollon nëse serveri përgjigjet. |
| `POST /v1/sessions` | Krijon një sesion dhe kthen `session_id`. |
| `GET /v1/sessions/{session_id}` | Kthen revizionin dhe historikun e sesionit. |
| `POST /v1/sessions/{session_id}/messages` | Merr objektin JSON me `text` dhe gjuhën opsionale `language` (fillimisht `en`). |
| `DELETE /v1/sessions/{session_id}` | Fshin sesionin dhe historikun e tij. |

Të gjitha rrugët e sesioneve kërkojnë `Authorization: Bearer TOKEN`.
Zëvendëso `SESSION_ID` me vlerën nga përgjigjja e parë:

```sh
curl -sS -X POST http://127.0.0.1:8080/v1/sessions \
  -H "Authorization: Bearer $XSUS_API_TOKEN"

curl -sS -X POST http://127.0.0.1:8080/v1/sessions/SESSION_ID/messages \
  -H "Authorization: Bearer $XSUS_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Clarify: Please return the receipt soon.","language":"en"}'
```

Nëse dy kërkesa përdorin të njëjtin revizion, vetëm një shkrim pranohet.
Klienti mund ta rilexojë sesionin pas një konflikti. Databaza i ruan
sesionet pas rinisjes së procesit.

API-ja pranon mesazhe deri në 4 096 karaktere dhe trupa HTTP deri në 32 KiB.
Kur tetë kërkesa për mesazhe janë duke u përpunuar, kërkesa pasuese merr
`503` me kodin `message_capacity`. Gjuha e disponueshme në këtë nisje
është `en`. Një gjuhë tjetër merr `422` me kodin `unsupported_language`.
