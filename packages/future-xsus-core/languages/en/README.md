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

## Modeli v3 për biseda të shkurtra dhe sqarim

V3 përdor 197 shembuj trajnimi. Për formatet që njeh, motori normalizon përshëndetjet, falënderimet, kërkesat për shënime falënderimi dhe kërkesat për sqarim. Për shembull, një kërkesë për ta bërë më të qartë një afat të shprehur si «soon» kthehet në një udhëzim të brendshëm për të kërkuar afatin. Modeli i trajnuar nga XSUS gjeneron pyetjen. Riformulimi ruan faktet me shënues dhe njeh edhe udhëzime si «Can you say this in fewer words?».

| Grupi i vlerësimit | Përgjigje të pranuara v2 | Përgjigje të pranuara v3 | Fakte të ruajtura v2 | Fakte të ruajtura v3 |
| --- | ---: | ---: | ---: | ---: |
| Rastet e reja të v3 | 0/16 | 16/16 | 0/6 | 6/6 |
| Përsëritja e provave të v2 | 6/12 | 12/12 | 6/7 | 7/7 |

Të dy grupet mbahen jashtë trajnimit. Ato matin kërkesa të reja dhe vlera të reja brenda llojeve të përcaktuara. Për biseda të hapura mbetet një model i kufizuar. Për ta përdorur v3, cakto shtegun e checkpoint-it me `XSUS_EN_CHECKPOINT`.

```sh
XSUS_EN_CHECKPOINT=languages/en/models/checkpoints/xsus-en-conversation-v3.json.gz \
  python3 -m languages.en.evaluation.demo 'Clarify: Please return the receipt soon.'
```

Ritrajnimi dhe krahasimi me v2:

```sh
python3 -m languages.en.data.preparation.expand_corpus --version v3 --output /tmp/xsus-en-training-v3.jsonl
python3 -m languages.en.training.train \
  --training /tmp/xsus-en-training-v3.jsonl \
  --evaluation languages/en/evaluation/quality-v3.jsonl \
  --conversation-v3 --output /tmp/xsus-en-conversation-v3.json.gz
python3 -m languages.en.evaluation.compare \
  --training /tmp/xsus-en-training-v3.jsonl \
  --evaluation languages/en/evaluation/quality-v3.jsonl \
  --baseline languages/en/models/checkpoints/xsus-en-rewrite-v2.json.gz \
  --candidate /tmp/xsus-en-conversation-v3.json.gz
```

Për të përsëritur grupin e mëparshëm, përdor `quality-v2.jsonl` te parametri `--evaluation` i komandës së krahasimit.

## Morfologjia, gramatika dhe sintaksa

Analizuesi i anglishtes ekzekutohet lokalisht dhe përdor fjalorë të vegjël e rregulla të XSUS.

| Skedari | Përgjegjësia |
| --- | --- |
| `text/morphology.py` | Gjeneron format kryesore të foljeve dhe shumësin e emrave. Përdor një fjalor për format e parregullta dhe rregulla drejtshkrimore për format e rregullta. |
| `text/syntax.py` | Dallon kryefjalën, foljen kryesore, foljen ndihmëse, kundrinorin, plotësuesin dhe mohimin. Mbulon pohime, mohime dhe pyetje po/jo me `do`, `have` dhe `be`. |
| `text/grammar.py` | Kontrollon përputhjen me kryefjalën, rasën e përemrave, numrin e përcaktorëve dhe formën që kërkon folja ndihmëse. |
| `text/linguistics.py` | Ekspozon analizën e përbashkët përmes `analyze_english()` dhe komandës lokale. |

Nga rrënja `packages/future-xsus-core/`:

```sh
python3 -m languages.en.text.linguistics verb write
python3 -m languages.en.text.linguistics plural child
python3 -m languages.en.text.linguistics clause 'They writes.'
python3 -m languages.en.text.linguistics clause 'Alex called Sam.'
python3 -m languages.en.text.linguistics clause 'Did Alex wrote the report?'
python3 -m languages.en.text.linguistics clause 'Alex has wrote the report.'
python3 -m languages.en.text.linguistics clause "Isn't Alex writing the report?"
```

Pas `do` pritet forma bazë, pas `have` pjesorja e shkuar dhe pas `be` në ndërtimin progresiv forma me `-ing`. Për shembull, `Did Alex wrote` merr sugjerimin `write`, ndërsa `Alex has wrote` merr `written`. Mohimi njihet si `not` ose në shkurtime si `didn't` dhe `isn't`.

Analizuesi përdor një fjalor të kufizuar dhe mbulon një folje ndihmëse për ndërtim. Pyetjet me fjalë pyetëse, zinxhirët me disa folje ndihmëse dhe analiza e zërit pësor mbeten jashtë mbulimit. Për strukturat që nuk i analizon, komanda kthen `unsupported_clause`. Analizuesi ekzekutohet më vete nga gjenerimi i bisedës.
