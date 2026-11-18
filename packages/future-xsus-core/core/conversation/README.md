# Biseda me historik

`SessionConversation` merr një sesion ekzistues, përdor historikun e tij në
kërkesën gjuhësore dhe regjistron çiftin mesazh–përgjigje pasi motori kthen
tekst të vlefshëm. Mund të përdorë ruajtjen në memorie ose në SQLite.
Aplikacioni siguron identitetin e pronarit, identifikuesin e sesionit, gjuhën
dhe afatin absolut të ekzekutimit të kërkesës.

Dështimi i motorit kthehet pa shkruar në historik. Nëse një kërkesë tjetër
ka përditësuar sesionin, ruajtja ngre `SessionRevisionError`. Aplikacioni
vendos nëse kërkesa duhet përsëritur mbi revizionin e ri.

Afati i kërkesës zbatohet nga ekzekutuesi i motorit. Nëse thirrësi anulon
pritjen pasi shkrimi ka nisur në një thread, transaksioni mund të përfundojë.
Thirrësi mund ta rilexojë sesionin për të përcaktuar rezultatin.

Kur aplikacioni e di cilin revizion ka parë klienti, ia kalon si
`expected_revision`. Një revizion i vjetruar refuzohet para se të thirret
motori. Kontrolli gjatë shkrimit zbatohet edhe kur kjo fushë lihet bosh.
