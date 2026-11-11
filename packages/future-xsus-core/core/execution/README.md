# Ekzekutimi i kërkesave

`request_executor.py` menaxhon afatin, thërret drejtuesin për zgjedhjen e instancës dhe validon përgjigjen. `transport.py` përcakton ndërfaqen për thirrjen e një motori. `local_transport.py` lidh identitetet e instancave me motorët në procesin aktual.

## Rrjedha

1. Regjistro motorët dhe instancat te `EngineRegistry` dhe jep motorët lokalë te `LocalEngineTransport`. Ndërto `RequestExecutor(router, transport)` dhe thirr `await executor.execute(request)`.
2. Përpjekja e parë përdor identifikuesin e kërkesës dhe të përpjekjes që ka dhënë thirrësi. Kur një instancë raporton një gabim të përkohshëm ose kalon kohën e përpjekjes, ekzekutuesi kërkon një instancë tjetër të të njëjtit motor dhe revizion. Çdo riprovim ruan kërkesën dhe afatin fillestar, përdor identifikues të ri për përpjekjen dhe përjashton instancat e provuara.
3. Si parazgjedhje lejohen deri në tri përpjekje gjithsej dhe deri në 10 sekonda për përpjekje. Afati i kërkesës kufizon çdo përpjekje. Afati UTC përkthehet një herë në orën monotone të procesit.
4. Rezultati i një motori kthehet si `EngineResponse`. Kur ekzekutuesi gjeneron gabimin, si për shembull kur mungon një instancë ose ka skaduar afati, rezultati është `EngineError`. Gabimet përfundimtare të motorit dhe përgjigjet e pavlefshme e mbyllin kërkesën. Kur shterojnë instancat ose përpjekjet, kthehet dështimi i fundit.

Anulimi i detyrës së thirrësit përhapet si `asyncio.CancelledError` dhe anulon përpjekjen aktive. Nëse një motor vonon ndalimin pas anulimit, rezultati i tij hidhet poshtë. Motorët lokalë duhet të bashkëpunojnë me anulimin dhe të mos bllokojnë ciklin e ngjarjeve.

`remote_transport.py` thërret motorët përmes HTTP dhe përdor të njëjtën ndërfaqe `EngineTransport`. `http_wire.py` kodon kërkesat dhe përgjigjet sipas kontratës. `http_protocol.py` përcakton adresën e ekzekutimit, formatin e autorizimit dhe kufirin e madhësisë. Shiko [shërbimin e motorit](../../services/engine-worker/README.md) për nisjen dhe konfigurimin.

Nga rrënja e paketës, instalo varësinë e transportit për të ekzekutuar të gjithë skenarët:

```sh
python3 -m pip install -r requirements-remote.txt
python3 -m unittest discover -s tests/contracts -v
python3 -m unittest discover -s tests/integration -v
```
