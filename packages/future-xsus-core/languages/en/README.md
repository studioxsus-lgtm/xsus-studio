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

## Zgjedhja e modelit

`XSUS_EN_MODEL_PROFILE` pranon `seed-v1`, `rewrite-v2` dhe `conversation-v3`.
Për secilin profil, motori kontrollon SHA-256 të checkpoint-it kundrejt
manifestit përpara se të regjistrojë instancën. Pa konfigurim ngarkohet v1.
Për një checkpoint të personalizuar përdor `XSUS_EN_CHECKPOINT`. Cakto vetëm
njërën nga këto dy variabla.

```sh
XSUS_EN_MODEL_PROFILE=conversation-v3 \
  python3 -m languages.en.evaluation.demo 'Clarify: Please return the receipt soon.'
```

Testet e anglishtes rivlerësojnë modelin v3 në të dy grupet e mbajtura jashtë
trajnimit dhe kontrollojnë rezultatet kundrejt manifestit.

## Morfologjia, gramatika dhe sintaksa

Analizuesi i anglishtes ekzekutohet lokalisht dhe përdor fjalorë të vegjël e rregulla të XSUS.

| Skedari | Përgjegjësia |
| --- | --- |
| `text/morphology.py` | Gjeneron format kryesore të foljeve dhe shumësin e emrave. Përdor një fjalor për format e parregullta dhe rregulla drejtshkrimore për format e rregullta. |
| `text/syntax.py` | Dallon kryefjalën, foljen kryesore, foljen ndihmëse, kundrinorin, plotësuesin dhe mohimin. Mbulon pohime, mohime, pyetje po/jo dhe pyetje të thjeshta për kryefjalën, kundrinorin, vendin, kohën, mënyrën dhe arsyen. |
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
python3 -m languages.en.text.linguistics clause 'Who wrote the report?'
python3 -m languages.en.text.linguistics clause 'What did Alex write?'
python3 -m languages.en.text.linguistics clause 'When is the meeting?'
python3 -m languages.en.text.linguistics clause 'Was the report written by Alex?'
python3 -m languages.en.text.linguistics clause 'Why did Alex call Sam?'
```

Pas `do` pritet forma bazë, pas `have` pjesorja e shkuar dhe pas `be` në ndërtimin progresiv forma me `-ing`. Për shembull, `Did Alex wrote` merr sugjerimin `write`, ndërsa `Alex has wrote` merr `written`. Pas foljeve modale si `can`, `should` dhe `will` pritet gjithashtu forma bazë.
Për shembull, `Can Alex writes the report?` merr sugjerimin `write`.
Mohimi njihet si `not`, si `cannot` dhe në shkurtime si `didn't`, `isn't` dhe `can't`.

Pyetjet me `who` dhe `what` mund të kërkojnë kryefjalën ose kundrinorin e drejtë. `Whom` përdoret për kundrinorin. Kur dallon një prej këtyre strukturave, rezultati jep `interrogative_role` si `subject` ose `object`. Numri i një kryefjale pyetëse mbetet i papërcaktuar kur mungon konteksti.

`Where`, `when`, `how` dhe `why` japin rolet `location`, `time`, `manner` dhe `reason`. Në pyetje si `Where is Alex?` dhe `When is the meeting?`, fjala pyetëse shfaqet edhe si plotësues i këpujës. Pyetjet që përdorin një folje kryesore ruajnë kundrinorin e saj, si `Sam` në `Why did Alex call Sam?`.

Ndërtimet pësore me një formë të fundme të `be` dhe pjesore të shkuar të
një foljeje kalimtare raportojnë `voice: passive`. Në `Was the report
written by Alex?`, raporti mbetet kryefjalë dhe rezultati jep `Alex` si
`agent`. Fraza me `by` pranohet për përemra, emra të përveçëm dhe një
grup të kufizuar emrash që mund të jenë veprues. Shprehjet kohore si
`by Friday` mbeten jashtë analizës së ndërtimit pësor.

Analizuesi përdor një fjalor të kufizuar dhe mbulon një folje ndihmëse për ndërtim. Pyetjet e ndërthurura, shprehjet si `how many` dhe zinxhirët me disa folje ndihmëse mbeten jashtë mbulimit. Për strukturat që nuk i analizon, komanda kthen `unsupported_clause`. Analizuesi ekzekutohet më vete nga gjenerimi i bisedës.

## Modeli v4 për anglishten e shkruar

Profili `written-v4` shton 12 mësime për gramatikën dhe shkrimin. Ato mbulojnë
fjalitë e paplota, lidhjen e fjalive vetëm me presje, zërin vepror dhe pësor,
përputhjen e kryefjalës me foljen, paralelizmin, fjalinë kryesore të paragrafit,
shkrimin e përmbledhur, tonin formal, pikëpresjen, apostrofin pronor dhe
gjuhën e thjeshtë.

Korpusi përfshin 197 shembujt e v3 dhe 216 formulime të reja. Normalizuesi
identifikon vetëm kërkesa të mbështetura për një temë të vetme. Modeli
gjeneron shpjegimin nga checkpoint-i. Për 36 kërkesat në vlerësimin v4,
formulimet janë të reja dhe temat janë ato të trajnuara.

| Vlerësimi | v3 | v4 |
| --- | ---: | ---: |
| Anglishtja e shkruar | 0/36 | 36/36 |
| Biseda dhe sqarime | 16/16 | 16/16 |
| Riformulime | 12/12 | 12/12 |

Zgjedhja e profilit:

```sh
XSUS_EN_MODEL_PROFILE=written-v4 \
  python3 -m languages.en.evaluation.demo 'Could you briefly explain apostrophes for possession?'
```

Trajnimi mund të riprodhohet me NumPy 2.3.5 dhe bibliotekën standarde të Python-it.
Gjatë gjenerimit dhe testimit të checkpoint-it nuk kërkohet NumPy.

```sh
python3 -m languages.en.data.preparation.expand_corpus --version v4 --output /tmp/xsus-training-v4.jsonl
OPENBLAS_NUM_THREADS=1 python3 -m languages.en.training.train \
  --training /tmp/xsus-training-v4.jsonl --evaluation languages/en/evaluation/quality-v4.jsonl \
  --written-v4 --vectorized --merges 192 --hidden-size 32 --context-size 64 --epochs 32 \
  --output /tmp/xsus-en-written-v4.json.gz
```

## Modeli v5 për anglishten e shkruar

Profili `written-v5` shton 24 mësime. Gramatika dhe pikësimi mbulojnë ndër të
tjera fjalitë lidhore, modifikuesit, referencat e përemrave, kohët e foljeve,
vizën lidhëse dhe përdorimin e nyjave. Mësimet e redaktimit trajtojnë qartësinë
dhe organizimin e tekstit. Burimet e dy grupeve gjenden në `data/lessons/`.

Korpusi ka 2 573 shembuj. Nga këta, 2 160 janë formulime të reja për 24 tema,
me 90 formulime për temë. Trajnimi kufizon në 12 përsëritjet e një shembulli
pas normalizimit. Grupi i vlerësimit v5 përdor 72 kërkesa të veçuara me
formulime dhe terma alternativë për të njëjtat tema.

```sh
XSUS_EN_MODEL_PROFILE=written-v5 \
  python3 -m languages.en.evaluation.demo 'What should an editor know about defining relative clauses?'
```

Për të rindërtuar korpusin dhe për të trajnuar checkpoint-in, përdor
NumPy 2.3.5. Për ekzekutimin e modelit të trajnuar mjafton biblioteka
standarde e Python-it.

```sh
python3 -m languages.en.data.preparation.build_written_v5 --output-root /tmp/xsus-written-v5
OPENBLAS_NUM_THREADS=1 python3 -m languages.en.training.train \
  --training /tmp/xsus-written-v5/data/training-v5.jsonl \
  --evaluation /tmp/xsus-written-v5/evaluation/quality-v5.jsonl \
  --written-v5 --vectorized --merges 256 --hidden-size 40 --context-size 64 \
  --epochs 32 --max-prepared-repeats 12 --output /tmp/xsus-en-written-v5.json.gz
```

| Vlerësimi | v4 | v5 |
| --- | ---: | ---: |
| Mësimet e reja të anglishtes së shkruar | 0/72 | 72/72 |
| Mësimet e v4 | 36/36 | 36/36 |
| Biseda dhe sqarime | 16/16 | 16/16 |
| Riformulime | 12/12 | 12/12 |

## Korrigjimi i fjalive

`text/editing/` përdor analizuesin e anglishtes për të korrigjuar një
fjali në një kohë. Për strukturat e mbështetura kontrollon përputhjen
kryefjalë–folje, format e foljeve pas ndihmëseve, trajtat e përemrave
dhe numrin e përcaktorëve. Mund të korrigjojë edhe pyetje dhe fjali në
zërin pësor brenda gramatikës së mbuluar.

Çdo ndryshim duhet të ketë një pozicion të vetëm të mundshëm. Fjalia e
korrigjuar analizohet përsëri para pranimit. Rezultati `review_required`
ruan tekstin origjinal kur analiza mungon ose korrigjimi mbetet i paqartë.
`unchanged` tregon se analizuesi nuk gjeti problem brenda rregullave që
mbulon. Rezultati i komandës përfshin pozicionet e ndryshimeve në vargun
origjinal. Hapësirat dhe pikësimi ruhen.

```sh
python3 -m languages.en.text.editing 'What did Alex wrote?'
printf '%s\n' 'They writes.' 'They write.' | python3 -m languages.en.text.editing --lines
```

Me profilin `written-v5`, mund të kërkosh korrigjim në bisedë duke e
paraprirë fjalinë me `Proofread:` ose `Correct the grammar:`.

```sh
XSUS_EN_MODEL_PROFILE=written-v5 \
  python3 -m languages.en.evaluation.demo 'Proofread: Was those reports written by she?'
```

Vlerësimi krahasohet me pritjet e përcaktuara për 44 raste dhe raportohet
me `python3 -m languages.en.evaluation.proofreading`.

## Korrigjimi i paragrafëve

Me profilin `written-v5`, përdor `Proofread paragraph:` për disa fjali
në një kërkesë. Motori korrigjon fjalitë e mbështetura dhe ruan origjinalin
për pjesët që kërkojnë rishikim. Kur rezultati është i pjesshëm, përgjigjja
e shënon këtë qartë.

```sh
XSUS_EN_MODEL_PROFILE=written-v5 \
  python3 -m languages.en.evaluation.demo 'Proofread paragraph: They writes. What did Alex wrote?'
printf 'They writes.\r\n\r\nWhat did Alex wrote?\r\n' | python3 -m languages.en.text.editing --paragraph
python3 -m languages.en.evaluation.proofreading --paragraphs
```

Rezultati JSON jep pozicionet e pjesëve dhe të ndryshimeve në tekstin
origjinal. Ai dallon `corrected`, `unchanged`, `partial` dhe
`review_required`. Ndarja shmang pikësimin brenda citimeve, kllapave,
shkurtimeve të njohura dhe elipsave. Kufiri i një kërkese është 8 192
karaktere dhe 128 pjesë. Strukturat e ndërlikuara mund të kërkojnë
rishikim manual. Vlerësimi i dedikuar ka 31 raste.

## Fjalitë me dy pjesë dhe shpjegimi i korrigjimeve

Korrigjuesi mund të analizojë dy fjali deklarative të pavarura të
bashkuara me presje, pikëpresje ose një lidhëz të zakonshme
(`and`, `but`, `or`, `yet`, `so`). Nëse vetëm një presje i bashkon
dy fjalitë e pavarura, motori e zëvendëson me pikëpresje. Kur njëra pjesë
kërkon rishikim, korrigjuesi e ruan të gjithë fjalinë.

Me profilin `written-v5`, `Explain corrections:` kthen fjalinë e
korrigjuar dhe arsyen e çdo ndryshimi deri në tetë ndryshime.
`Explain paragraph corrections:` jep të njëjtin shpjegim për paragrafë.
Dalja JSON e mjetit lokal përmban të gjitha ndryshimet.

```sh
XSUS_EN_MODEL_PROFILE=written-v5 \
  python3 -m languages.en.evaluation.demo 'Explain corrections: They writes, Alex reads.'
python3 -m languages.en.evaluation.proofreading --cases languages/en/evaluation/proofreading-compounds-v1.jsonl
```

## Fjalitë me pjesë të varura

Korrigjuesi mbulon dy pjesë deklarative dhe një lidhëz të vetme nga
`because`, `although`, `if`, `unless`, `while`, `when`, `before`
dhe `after`. Kur pjesa e varur vjen e para, duhet të jetë e ndarë me
presje. Kur vjen e dyta, korrigjuesi ruan zgjedhjen ekzistuese të presjes.
Ndryshimet zbatohen vetëm pasi kontrollohen të dyja pjesët.

Ndërtimet e paqarta, si pyetjet e ndërfutura dhe përdorimi hipotetik
i `were`, ruhen për rishikim. `Explain corrections:` mund të shpjegojë
pse këto raste kërkojnë rishikim. Ky mbulim përfshin 47 raste të vlerësimit.

```sh
XSUS_EN_MODEL_PROFILE=written-v5 \
  python3 -m languages.en.evaluation.demo 'Proofread: Although they writes, Nina have checked the report.'
python3 -m languages.en.evaluation.proofreading --cases languages/en/evaluation/proofreading-dependent-v1.jsonl
```
