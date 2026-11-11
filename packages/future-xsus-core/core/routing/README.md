# Drejtimi i kërkesave

`metrics.py` mban matjet e vonesës dhe ngarkesës për instancat. `request_router.py` përdor regjistrin për të marrë instancat e gatshme dhe të përputhshme me kërkesën. Pastaj i rendit duke përdorur vetëm matjet e kandidatëve.

## Rregullat e zgjedhjes

1. Regjistri kontrollon gjuhën, aftësinë, versionin dhe parametrat e kërkesës. Drejtuesi pranon të njëjtët filtra për revizionin dhe instancat që duhen përjashtuar.
2. Kur matjet janë të freskëta, vonesa e vlerësuar është `ceil(latency_us × capacity / (capacity − in_flight))`. Ajo është një pikëzim krahasues në mikrosekonda. Një instancë plotësisht e ngarkuar përjashtohet nga zgjedhja.
3. Instancat e gatshme pa matje të freskëta mbeten të disponueshme pas kandidatëve me matje të freskëta. Si parazgjedhje, matjet skadojnë pas pesë sekondash. Kur kandidatët kanë të njëjtin rezultat ose asnjëri s'ka matje, vendos rendi i identifikuesve të instancave.
4. `select(request)` gjen zgjedhjen e parë me një kalim mbi kandidatët. `rank(request)` kthen kandidatët e renditur. Kur nuk ka kandidat të përshtatshëm, i pari kthen `None` dhe i dyti kthen `()`.

Matjet kohore përdorin orën monotone të procesit. Kur një matje vjen nga një server tjetër, mbledhësi i cakton kohën lokale të vëzhgimit përpara ruajtjes. Një matje më e vjetër ose me të njëjtën kohë nuk zëvendëson matjen e ruajtur. Kur një instancë hiqet nga regjistri, mbledhësi thërret `forget(instance_id)`.

Drejtuesi punon me gjendjen që sheh në çastin e përzgjedhjes. Mbledhja automatike e matjeve, thirrja e motorit dhe riprovimi pas një dështimi zhvillohen veçmas.
