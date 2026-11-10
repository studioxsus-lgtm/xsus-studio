# XSUS App V5.8 — Settings modal focus and scroll stability

## Ndryshimet
- Dialogu Settings ruan dhe rikthen `body.style.overflow` në vend që ta fshijë pa kusht.
- Hapja e përsëritur nuk e mbishkruan elementin e fokusuar fillimisht.
- Fokusimi kthehet vetëm nëse elementi ekziston ende në dokument.
- Tab dhe Shift+Tab rikthejnë fokusin brenda dialogut kur ai del jashtë.
- Escape mbyll dialogun aktiv dhe nuk propagandohet te kontrollet prind.

## Kufizimet
Testet janë statike. Nuk pretendohet testim real i fokusit me browser ose screen reader. Nuk ka lidhje me backend, Supabase apo motorët AI.
