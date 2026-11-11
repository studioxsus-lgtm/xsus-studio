# Future XSUS Core · Kontrata e motorëve gjuhësorë v1.0

Kontrata përcakton komunikimin mes bërthamës dhe motorëve të gjuhëve. Bërthama zgjedh motorin dhe instancën. Motori ekzekuton një kërkesë dhe kthen një rezultat të plotë. E njëjta ndërfaqe përdoret nga ekzekutuesi lokal dhe nga një adaptor i ardhshëm për serverë.

## Skedarët

| Skedari | Përgjegjësia |
| --- | --- |
| `common.py` | Versioni i kontratës, etiketa e gjuhës, aftësia dhe audioja |
| `request.py` | Llojet e kërkesave, konteksti i bisedës, identifikuesit dhe afati |
| `response.py` | Llojet e rezultateve dhe verifikimi ndaj kërkesës dhe instancës |
| `engine.py` | Identiteti i motorit, identiteti i instancës, aftësitë sipas variantit dhe ndërfaqja asinkrone |
| `errors.py` | Kodet e gabimeve dhe klasifikimi për kalimin te një instancë tjetër |

## Motori, versioni dhe instanca

- `engine_id` identifikon motorin e një gjuhe. `revision` identifikon një version të pandryshueshëm të atij motori, me modelet dhe konfigurimin e tij. `contract` identifikon versionin e ndërfaqes që ai zbaton.
- `instance_id` identifikon një ekzekutim të veçantë të motorit dhe duhet të jetë unik në regjistër për sa kohë mund të ketë përgjigje në pritje. Dy serverë mund të ekzekutojnë të njëjtin motor dhe revizion me identifikues të ndryshëm.
- `EngineDescriptor` deklaron një gjuhë primare dhe mund të deklarojë variante të saj veçmas, si `en`, `en-GB` dhe `en-US`. Çdo hyrje deklaron aftësitë e variantit, gjuhët e synuara të përkthimit, formatet e pranuara të audios dhe zërat e emërtuar kur zbatohen.
- Etiketat krahasohen pa dallim shkronjash të mëdha dhe të vogla. Profili v1 pranon gjuhën primare me shkrim, rajon dhe variante opsionale. Ai validon formën e etiketës. Regjistri përcakton cilat etiketa mbështeten dhe ruan çdo rregull të shprehur për variantet.
- Një motor `1.x` pranon një kërkesë `1.y` kur `x >= y`. Çdo version dytësor ruan sjelljen e versioneve dytësore më të hershme të të njëjtit version kryesor. Kërkesa dhe përgjigjja respektojnë versionin e kërkuar. Një version kryesor tjetër kërkon një kontratë të përputhshme të deklaruar.

## Kërkesat dhe përgjigjet

| Aftësia | Çfarë merr motori | Çfarë kthen motori |
| --- | --- | --- |
| Bisedë | Mesazhin dhe historikun e renditur. Gjuha e kërkesës është gjuha e përgjigjes. | Tekst në gjuhën e kërkuar |
| Përkthim | Tekstin, gjuhën burim dhe gjuhën e synuar | Tekst në gjuhën e synuar |
| Transkriptim | Audion, formatin dhe gjuhën e të folurit | Transkript në gjuhën e kërkuar. Teksti bosh shënon audio pa të folur të njohur. |
| Sintezë | Tekstin, gjuhën dhe, sipas kërkesës, identifikuesin e zërit | Audio, formati i audios dhe gjuha e kërkuar |

Çdo kërkesë mbart `request_id`, `attempt_id` dhe një afat të përbashkët `deadline_unix_ms` në UTC. Një kërkesë logjike ruan identifikuesin, përmbajtjen dhe afatin gjatë riprovimit. Çdo përpjekje merr identifikues të ri. Motori i kthen të dy identifikuesit bashkë me identitetin e instancës. Bërthama verifikon përputhjen përpara pranimit të rezultatit.

V1 trajton kërkesa të plota me një përgjigje përfundimtare. Historiku kalon në kërkesë dhe mund të përdoret nga cilado instancë e përshtatshme. Validimi i kontratës kontrollon formën dhe lidhjen e përgjigjes me kërkesën. Vlerësimi gjuhësor dhe verifikimi i kodekut të audios zhvillohen në shtresat përkatëse.

## Drejtimi i kërkesave dhe vazhdimësia në serverë

1. Regjistri lidh instancën me adresën e saj, gjendjen e shërbimit, ngarkesën dhe vonesën e matur. Ato janë të dhëna operative. Deklarata e motorit përmban identitetin dhe aftësitë.
2. Bërthama filtron instancat sipas kontratës, gjuhës së saktë, aftësisë dhe parametrave të deklaruar. Për shembull, për transkriptim në shqip me `audio/wav` zgjidhen instancat që deklarojnë pikërisht atë gjuhë, aftësi dhe format.
3. Ndër kandidatët e përshtatshëm, bërthama zgjedh sipas disponueshmërisë, vonesës së matur dhe ngarkesës. Një riprovim automatik kalon te një instancë tjetër e të njëjtit motor dhe revizion. Rregullat e veçanta të vendosjes përcaktohen në regjistër dhe konfigurim.
4. Kalimi te një instancë tjetër lejohet për `instance_unavailable`, `instance_overloaded` ose `instance_timeout`, për aq kohë sa kërkesa nuk është anuluar, ka kohë deri në afatin e saj dhe buxheti i përpjekjeve nuk është shteruar. Buxhetin dhe kufirin kohor të secilës përpjekje i cakton bërthama. Instanca e radhës trashëgon afatin origjinal.
5. Pas një riprovimi, bërthama pranon vetëm përgjigjen e përpjekjes aktive. Këto operacione përpunojnë hyrjen dhe kthejnë rezultat pa kryer veprime të jashtme në emër të përdoruesit. Nëse dy instanca përfundojnë të njëjtën kërkesë, bërthama ia dorëzon aplikacionit një rezultat të vetëm.

Gabimet e hyrjes, papajtueshmëria e versionit, një aftësi e pambështetur, anulimi dhe skadimi i afatit janë përfundimtare për atë kërkesë. Një gabim i brendshëm pa klasifikim mbetet përfundimtar. Aplikacioni merr kodin e qëndrueshëm dhe një përshkrim të shkurtër. Gabimet teknike të hollësishme ruhen në diagnostikën e serverit.

## Kufiri i fazës

Këta skedarë përcaktojnë kontratën e tipizuar dhe validimin në Python. Zbatimi i regjistrit, matja e gjendjes së serverëve, algoritmi i zgjedhjes, transporti gRPC dhe motorët e gjuhëve janë fazat pasuese.

Nga rrënja e paketës, provat ekzekutohen me:

```sh
python3 -m unittest discover -s tests/contracts -v
```
