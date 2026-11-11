# Motori fillestar i anglishtes

Motori `xsus-en` zbaton kontratën v1.0 për bisedë me tekst. Gjenerimi përdor tokenizer-in UTF-8/BPE dhe modelin shkakor të XSUS, të trajnuar nga pesha rastësore. Kodi i trajnimit dhe gjenerimit përdor bibliotekën standarde të Python-it. Versioni fillestar përfshin peshat e trajnuara dhe mund të ekzekutohet lokalisht pas marrjes së repository-t.

| Dosja | Përgjegjësia |
| --- | --- |
| `data/` | Dialogët origjinalë të trajnimit dhe manifesti i korpusit |
| `text/` | Tokenizer-i, formati i bisedës dhe gjenerimi i tokenëve |
| `models/` | Modeli, formati i ruajtjes, peshat dhe manifesti |
| `training/` | Trajnimi i riprodhueshëm dhe matja para e pas tij |
| `engine/` | Lidhja e modelit me Future XSUS Core |
| `evaluation/` | Dialogët e veçuar nga trajnimi dhe komanda për provën e bisedës |

## Ekzekutimi lokal

Nga rrënja `packages/future-xsus-core/`, me Python 3.11 ose më të ri:

```sh
python3 -m languages.en.evaluation.demo 'Make this polite: Send me the file today.' --follow-up 'Make it shorter.'
```

Kjo komandë e kalon kërkesën përmes regjistrit, drejtuesit dhe ekzekutuesit lokal. Shembulli është marrë nga korpusi i trajnimit për të verifikuar që skedarët e publikuar punojnë së bashku. Motori mund të ngarkohet edhe nga shërbimi ekzistues me fabrikën `languages.en.engine.english_engine:create_engine`. Jep një `XSUS_ENGINE_INSTANCE_ID` të ndryshëm për çdo instancë.

## Ritrenimi dhe vlerësimi

```sh
python3 -m languages.en.training.train --output /tmp/xsus-en-model.json.gz
```

Komanda e trajnon fjalorin vetëm mbi ndarjen e trajnimit, inicializon modelin me seed 23, ruan peshat dhe i ngarkon sërish para vlerësimit. Për ta provuar një checkpoint tjetër, cakto shtegun e tij në `XSUS_EN_CHECKPOINT`.

Versioni fillestar përdor 28 dialogë trajnimi dhe 6 dialogë vlerësimi. Humbja mesatare për token në dialogët e vlerësimit ra nga 5.8903 në 3.7899. Asnjë gjenerim nuk përputhej plotësisht me referencën. Disa përgjigje ndryshuan detaje ose prodhuan tekst të çrregullt. Ky version verifikon rrjedhën e trajnimit dhe ekzekutimit. Përgjithësimi te pyetjet e reja mbetet për zhvillim.
