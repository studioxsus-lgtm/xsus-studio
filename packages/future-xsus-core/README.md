# Future XSUS Core

Bërthamë në Python për ekzekutimin e motorëve gjuhësorë. Anglishtja është
motori i implementuar. Dosjet e shqipes dhe frëngjishtes ruajnë strukturën
për motorët e ardhshëm.

| Dosja | Përgjegjësia |
| --- | --- |
| `core/contracts/` | Kontratat e kërkesave, përgjigjeve dhe motorëve |
| `core/registry/`, `core/routing/` | Regjistrimi dhe përzgjedhja e instancave |
| `core/execution/` | Ekzekutimi dhe transporti lokal ose HTTP |
| `core/sessions/` | Historiku i kufizuar i bisedave në memorien e procesit |
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
