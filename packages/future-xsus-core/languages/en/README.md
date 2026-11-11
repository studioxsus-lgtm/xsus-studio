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

## Modeli v2 për riformulim

Korpusi v2 ka 142 shembuj. Për formatet e njohura të riformulimit, `text/normalization/rewrite_slots.py` nxjerr emrin, objektin, afatin ose numrin nga kërkesa. Gjatë trajnimit dhe gjenerimit modeli mëson formulimin me shënues për këto vlera. Pas gjenerimit, motori i rikthen vlerat origjinale. Për kërkesat që mbështeten te përgjigjja e mëparshme, vlerat merren nga ajo përgjigje. Nëse rezultati nuk përmban të gjithë shënuesit e kërkuar nga një herë, gjenerimi i strukturuar kthen rezultat bosh dhe motori raporton gabim.

Përdor checkpoint-in v2 duke e zgjedhur shprehimisht. Motori ngarkon v1 si parazgjedhje.

```sh
XSUS_EN_CHECKPOINT=languages/en/models/checkpoints/xsus-en-rewrite-v2.json.gz \
  python3 -m languages.en.evaluation.demo \
  'Make this polite: Jamie, send the invoice by Sunday at 4:30 p.m.' \
  --follow-up 'Make it shorter.'
```

| Modeli | Përgjigje të pranuara | Raste ku u ruajtën të gjitha faktet |
| --- | ---: | ---: |
| v1 | 0/12 | 0/7 |
| Korpusi v2 me përpunimin fillestar | 0/12 | 0/7 |
| Korpusi v2 me shënues për vlerat | 6/12 | 6/7 |

Prova përdor dialogë dhe kombinime që mungojnë në ndarjen e trajnimit. Kontrollon vlerat e kërkuara dhe pranon formulime alternative të paracaktuara. Shifrat përshkruajnë këtë grup të vogël. Jashtë formateve të mbështetura, modeli ende mund të japë përgjigje të çrregullta.

Për të riprodhuar korpusin, trajnimin dhe krahasimin:

```sh
python3 -m languages.en.data.preparation.expand_corpus --output /tmp/xsus-en-training-v2.jsonl
python3 -m languages.en.training.train \
  --training /tmp/xsus-en-training-v2.jsonl \
  --evaluation languages/en/evaluation/quality-v2.jsonl \
  --copy-rewrite-slots --output /tmp/xsus-en-rewrite-v2.json.gz
python3 -m languages.en.evaluation.compare \
  --baseline languages/en/models/checkpoints/xsus-en-seed-v1.json.gz \
  --candidate /tmp/xsus-en-rewrite-v2.json.gz
```
