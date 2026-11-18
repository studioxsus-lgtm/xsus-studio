# Future XSUS Core

Bërthamë në Python për ekzekutimin e motorëve gjuhësorë. Anglishtja është
motori i implementuar. Dosjet e shqipes dhe frëngjishtes ruajnë strukturën
për motorët e ardhshëm.

| Dosja | Përgjegjësia |
| --- | --- |
| `core/contracts/` | Kontratat e kërkesave, përgjigjeve dhe motorëve |
| `core/registry/`, `core/routing/` | Regjistrimi dhe përzgjedhja e instancave |
| `core/execution/` | Ekzekutimi dhe transporti lokal ose HTTP |
| `core/sessions/` | Historiku i kufizuar i bisedave në memorie ose në SQLite |
| `core/conversation/` | Ekzekutimi i bisedës me historik të versionuar |
| `languages/en/` | Modelet, analizuesi, të dhënat dhe vlerësimi i anglishtes |
| `services/engine-worker/` | Shërbimi HTTP për një instancë motori |
| `templates/language-engine/` | Struktura për një motor të ri |

Nga kjo dosje, me Python 3.12:

```sh
python3 -m pip install -r requirements-remote.txt
python3 -m unittest discover -s tests/contracts -v
python3 -m unittest discover -s tests/integration -v
python3 -m unittest discover -s languages/en/tests -v
```

Shih [motorin e anglishtes](languages/en/README.md) për profilet e modeleve
dhe [sesionet](core/sessions/README.md) për përdorimin e historikut nga një aplikacion.


Për ta vazhduar një bisedë pas rinisjes, krijo një sesion nga CLI-ja:

```sh
XSUS_EN_MODEL_PROFILE=conversation-v3 python3 -m languages.en.evaluation.demo \
  --session-db conversation.db 'Give this a warmer tone: We need the receipt by Friday at 9 a.m.'
```

Përdor identifikuesin e shtypur te `Session:` në thirrjen pasuese:

```sh
XSUS_EN_MODEL_PROFILE=conversation-v3 python3 -m languages.en.evaluation.demo \
  --session-db conversation.db --session-id IDENTIFIKUESI 'Can you say it in fewer words?'
```

Databaza përmban tekstin e bisedës. Ruaje në një dosje ku vetëm përdoruesit
e autorizuar kanë leje leximi.
