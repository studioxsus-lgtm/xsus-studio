# Regjistri i motorëve gjuhësorë

`engine_registry.py` regjistron deklaratat e motorëve, mban instancat dhe gjen kandidatët për një kërkesë. `instance.py` përcakton gjendjet e instancave. `errors.py` përcakton gabimet e regjistrimit dhe identitetet e panjohura. Kërkesat, përgjigjet dhe deklaratat e aftësive mbeten te [kontrata v1.0](../contracts/README.md).

## Regjistrimi dhe gjendja

1. Regjistro deklaratën e motorit me `register_engine(descriptor)`. Kombinimi i identifikuesit të motorit dhe revizionit ka një deklaratë të pandryshueshme. Një revizion tjetër mund të bashkëjetojë me të parin.
2. Regjistro çdo instancë me `register_instance(instance)`. Instanca e re fillon në `UNAVAILABLE`. Kalimi në `READY` bëhet kur kontrolli i disponueshmërisë e konfirmon. Përdor `DRAINING` kur instanca duhet të përfundojë punën e marrë dhe të dalë nga përzgjedhja e kërkesave të reja.
3. Përsëritja e regjistrimit me të njëjtin identitet ruan gjendjen aktuale. Një identitet i njëjtë me të dhëna të ndryshme refuzohet. Kur hiqet një instancë, përdor një identifikues të ri për ekzekutimin pasues që të dallohen edhe përgjigjet e vonuara.

## Përzgjedhja e kandidatëve

`candidates(request)` merr kandidatët nga indeksi i gjuhës dhe aftësisë. Për çdo revizion kandidat verifikon versionin e kontratës dhe parametrat e aftësisë, si drejtimi i përkthimit, formati i audios ose zëri i kërkuar. Indeksi përmban vetëm instancat `READY`. Ndryshimi i gjendjes dhe përditësimi i indeksit kryhen së bashku.

Kur shtresa e ekzekutimit riprovon një kërkesë, mund t'i kalojë regjistrit revizionin e zgjedhur me `engine=` dhe instancat e provuara me `exclude_instance_ids=`. Rezultati është një fotografi e gjendjes në çastin e leximit, me rend të qëndrueshëm sipas identifikuesit të instancës. Renditja sipas vonesës dhe ngarkesës i përket drejtimit të kërkesave. Gjendja mund të ndryshojë pas leximit dhe ekzekutuesi trajton dështimet gjatë thirrjes.

Ky regjistër punon në memorien e një procesi. Kontrolli automatik i serverëve, koordinimi ndërmjet proceseve dhe ridërgimi i kërkesave zbatohen në shtresat përkatëse.

Nga rrënja e paketës, me Python 3.11 ose më të ri:

```sh
python3 -m unittest discover -s tests/contracts -v
python3 -m unittest discover -s tests/integration -v
```
