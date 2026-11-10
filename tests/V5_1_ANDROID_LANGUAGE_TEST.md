# XSUS App V5.1 — Kontrolli real në Android

## Përgatitja
1. Shkarko ZIP dhe nxirre të gjithë dosjen. Mos hap vetëm `app.html` nga brenda ZIP-it.
2. Për shkak të JavaScript modules, faqja duhet të hapet përmes një serveri HTTP ose hostimi statik që ruan të njëjtën strukturë dosjesh. Hapja `file://` mund të mos funksionojë.
3. Hap `app.html` në Chrome ose Firefox në telefon.

## Testet që duhet të kryhen në shfletues
- [ ] Faqja hapet pa ekran bosh; logoja XSUS App shfaqet.
- [ ] Zgjidh SQ: titulli, navigimi dhe butonat kalojnë në shqip.
- [ ] Zgjidh FR: të njëjtat pjesë kalojnë në frëngjisht.
- [ ] Zgjidh EN: rikthehet anglishtja.
- [ ] Hap Builder, Dashboard, Chat, Editor, Projects, History, Testing, Publishing, Settings. Kontrollo tekstet dhe hapësirën në ekran.
- [ ] Shkruaj një fjali unike në fushën Chat. Ndërro gjuhën; fjalia nuk duhet të ndryshojë.
- [ ] Ndërro gjuhën te Settings; zgjedhësi në header duhet të sinkronizohet.
- [ ] Rifresko faqen; gjuha e zgjedhur duhet të ruhet.
- [ ] Kthe telefonin horizontalisht dhe vertikalisht; nuk duhet të ketë kontrolle të paarritshme.
- [ ] Testo edhe ekranin e gjerë nëse ke kompjuter.

## Raportimi i një problemi
Shëno: gjuhën, modulin, tekstin e gabuar, veprimin e kryer, modelin e shfletuesit dhe një screenshot. Mos përfshi të dhëna private në screenshot.

## Kufizim
Ky është një projekt demonstrativ pa backend. Kalimi i testeve të përkthimit nuk vërteton funksionimin e AI ose publikimin e aplikacioneve.
