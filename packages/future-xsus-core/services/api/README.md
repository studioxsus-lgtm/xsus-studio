# API-ja lokale e Future XSUS Core

API-ja lidh klientët HTTP me bërthamën e bisedave, motorin e anglishtes dhe
sesionet në SQLite. Nisja lokale përdor `127.0.0.1` ose `::1`; `0.0.0.0`
mund të zgjidhet shprehimisht kur shërbimi vendoset pas një proxy-je HTTPS.
Përdoruesit realë autentikohen veçmas përmes Supabase Auth.

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

## Llogari reale me Supabase

Për shumë përdorues, konfiguro `XSUS_SUPABASE_URL` dhe
`XSUS_SUPABASE_PUBLISHABLE_KEY`. Klienti dërgon access token-in e hyrjes së
përdoruesit në `Authorization: Bearer ...`; API-ja e verifikon me Supabase Auth
dhe i cakton sesionet UUID-së së llogarisë. Email-i dhe profili nuk ruhen në
Future XSUS Core. Në këtë mënyrë, secili përdorues sheh vetëm sesionet dhe
shembujt e vet të feedback-ut. Nëse aktivizohet Supabase, hiqe
`XSUS_API_TOKEN` nga konfigurimi.

Për frontend-in në browser, cakto `XSUS_API_ALLOWED_ORIGINS` në listën e
origjinave HTTPS, të ndara me presje, për shembull
`https://www.xsusstudio.com,https://xsusstudio.com`. API-ja pranon vetëm
origjinat e listuara, metodat `GET`, `POST`, `DELETE` dhe titujt `Authorization`
e `Content-Type`. Pa origjinë të konfiguruar, kërkesat nga browser-i bllokohen;
klientët server-side dhe komandat lokale vazhdojnë të punojnë.

## Vendosja në Render

Blueprint-i i këtij shërbimi është te `services/api/deploy/render.yaml`.
Në Render zgjidhni këtë rrugë si Blueprint Path, degën `future-xsus-core` dhe
plotësoni `XSUS_SUPABASE_URL` dhe `XSUS_SUPABASE_PUBLISHABLE_KEY` kur kërkohen.
Blueprint-i përdor një disk të qëndrueshëm për sesionet, feedback-un,
kandidatët dhe regjistrat e modeleve. Worker-i aktivizohet në këtë shërbim dhe
kontrollon çdo 60 sekonda: ai përdor vetëm shembujt që përdoruesi ka dërguar me
pëlqim të qartë dhe më pas i ka pranuar. Pas të paktën pesë shembujve të
pranuar krijon kandidat të ndarë për pronar; aktivizimi i kandidatit kërkon
shqyrtim njerëzor. Endpoint-i publik duhet të përdoret vetëm përmes HTTPS.

| Metoda dhe rruga | Funksioni |
| --- | --- |
| `GET /healthz` | Kontrollon nëse serveri përgjigjet. |
| `POST /v1/sessions` | Krijon një sesion dhe kthen `session_id`. |
| `GET /v1/sessions` | Liston identifikuesit dhe revizionet e sesioneve të pronarit. |
| `GET /v1/sessions/{session_id}` | Kthen revizionin dhe historikun e sesionit. |
| `POST /v1/sessions/{session_id}/messages` | Merr objektin JSON me `text` dhe fushat opsionale `language` (fillimisht `en`) dhe `expected_revision`. |
| `DELETE /v1/sessions/{session_id}` | Fshin sesionin dhe historikun e tij. |
| `POST /v1/learning/feedback` | Dërgon shembull vetëm me `consent: true`; shembulli mbetet në pritje për shqyrtim. |
| `GET /v1/learning/feedback` | Liston ID-të e shembujve në pritje të pronarit. |
| `GET /v1/learning/feedback/{example_id}` | Lexon shembullin vetëm për pronarin e autentikuar. |
| `POST /v1/learning/feedback/{example_id}/accept` | Pranon shembullin pas shqyrtimit të pronarit. |
| `POST /v1/learning/feedback/{example_id}/reject` | Refuzon shembullin pas shqyrtimit të pronarit. |
| `DELETE /v1/learning/feedback/{example_id}` | Fshin shembullin e pronarit nga databaza e feedback-ut. |

Të gjitha rrugët e sesioneve kërkojnë `Authorization: Bearer TOKEN`.
Rrugët e feedback-ut kërkojnë të njëjtin autorizim. API-ja nuk mbledh
automatikisht bisedat: dërgimi kërkon pëlqim të qartë dhe ruan vetëm shembullin
e dorëzuar në pritje. Pronari e shqyrton para se të bëhet i përdorshëm nga
cikli lokal i mësimit; vendimi i shqyrtuar nuk mund të ndryshohet, ndërsa
shembulli mund të fshihet. Vetëm kërkesa e autentikuar `GET` me ID-në e
shembullit kthen tekstin privat, dhe vetëm nëse ID-ja i përket pronarit.
Historia, nëse dërgohet, lejon deri në 16 kthesa me role `user` ose
`assistant`. Databaza e feedback-ut ruhet veçmas nga databaza e sesioneve, me
prapashtesën `.feedback.sqlite3`.

Shembull dërgimi i shprehur nga përdoruesi:

```sh
curl -sS -X POST http://127.0.0.1:8080/v1/learning/feedback \
  -H "Authorization: Bearer $XSUS_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"consent":true,"prompt":"Explain a clear sentence.","response":"It expresses a complete thought."}'
```

Ruaj `example_id` nga përgjigjja për ta shqyrtuar me `POST .../{example_id}/accept`
ose `POST .../{example_id}/reject`. Për ta fshirë, përdor
`DELETE .../{example_id}`.

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


Lista renditet sipas identifikuesit. `limit` pranon vlera nga 1 deri në 100,
me parazgjedhje 20. Kur `next_cursor` ka vlerë, dërgoje si `after` për
faqen pasuese. Lista përmban vetëm `session_id` dhe `revision`. Historiku
lexohet duke hapur një sesion.

Për ta lidhur një mesazh me versionin që ka parë klienti, merr `revision`
nga sesioni dhe dërgoje si `expected_revision`. Nëse revizioni ka ndryshuar,
API-ja kthen `409 session_conflict` para gjenerimit. Shkrimi kontrollon sërish
revizionin pasi përgjigjet motori. Fusha është opsionale për klientët ekzistues.
