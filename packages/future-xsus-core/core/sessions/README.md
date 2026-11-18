# Sesionet e bisedës

`InMemorySessionStore` ruan historikun deri në mbylljen e procesit. `SQLiteSessionStore`, në modulin `sqlite_store.py`, përdor të njëjtën ndërfaqe dhe e ruan historikun në një skedar lokal edhe pas rinisjes. Identifikuesi i pronarit merret nga shtresa e autentikimit e aplikacionit. Identifikuesi i sesionit gjenerohet kur krijohet sesioni dhe çdo lexim, shkrim ose fshirje kërkon të dy identifikuesit.

Aplikacioni lexon pamjen e sesionit me `get`, ndërton operacionin me `snapshot.conversation(text)` dhe, pasi merr një përgjigje të suksesshme, thërret `append_exchange` me `expected_revision=snapshot.revision`. Çdo shtim regjistron së bashku mesazhin dhe përgjigjen. Një revizion i vjetruar rezulton në `SessionRevisionError`. Përpunimi i një përgjigjeje të re mund të niset duke marrë një pamje të përditësuar të historikut.

Kufijtë e parazgjedhur janë 128 sesione, 8 shkëmbime dhe 16 384 karaktere historie për sesion. Kur historia kalon kufirin, hiqen shkëmbimet më të vjetra si çifte. Kur mbushet kapaciteti i sesioneve, krijimi refuzohet derisa aplikacioni të fshijë një sesion.

Për ruajtje pas rinisjes, krijo `SQLiteSessionStore(path)`, ku `path` tregon te një skedar i aplikacionit. Proceset që hapin të njëjtin skedar duhet të përdorin të njëjtët kufij. Çdo shkrim bëhet në një transaksion dhe një revizion i caktuar pranohet vetëm një herë, edhe kur e përdorin dy procese njëkohësisht. Kontrolli sipas pronarit zbatohet në API-n e sesioneve, ndërsa lejet e sistemit operativ mbrojnë vetë skedarin.
