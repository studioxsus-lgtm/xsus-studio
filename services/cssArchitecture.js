// ============================================================================
// XSUS AI - CSS ARCHITECTURE & DESIGN SYSTEMS MASTER KNOWLEDGE BASE
// Version: 1.0.0 (Bilingual Structured Engine)
// ============================================================================

export const cssArchitectureKnowledge = {
  id: "css-architecture",
  title: "CSS Architecture, Naming Conventions & Design Systems",
  title_sq: "Arkitektura e CSS-it, Konventat e Emërtimit dhe Sistemet e Dizajnit",
  description:
    "A comprehensive guide to scalable, maintainable, reusable, and consistent CSS architecture for modern web applications.",
  description_sq:
    "Udhëzues gjithëpërfshirës për arkitekturë CSS të shkallëzueshme, të mirëmbajtshme, të ripërdorshme dhe të qëndrueshme për aplikacione moderne web.",
  version: "1.0.0",
  language: ["sq", "en"],

  sections: [
    {
      id: "css-architecture-fundamentals",
      title: "CSS Architecture Fundamentals",
      title_sq: "Bazat e Arkitekturës CSS",
      content_sq: `
Arkitektura CSS përcakton mënyrën se si organizohen, emërtohen, ndahen dhe mirëmbahen stilet e një projekti.

Një arkitekturë e mirë duhet të ofrojë:
- Parashikueshmëri: stilet të sillen në mënyrë të kuptueshme.
- Ripërdorim: komponentët të ndajnë stile pa kopjim të panevojshëm.
- Izolim: ndryshimet lokale të mos ndikojnë papritur pjesë të tjera.
- Shkallëzueshmëri: sistemi të mbështesë rritjen e aplikacionit.
- Mirëmbajtshmëri: zhvilluesit të kuptojnë shpejt ku duhet bërë ndryshimi.
- Konsistencë: ngjyrat, hapësirat, tipografia dhe komponentët të ndjekin të njëjtat rregulla.

Në një projekt të vogël, një skedar CSS mund të jetë i mjaftueshëm. Në një aplikacion të madh, ndarja sipas komponentëve, përgjegjësive dhe shtresave e bën kodin më të menaxhueshëm.

Parimi kryesor: organizo CSS-in sipas nevojave reale të projektit dhe shmang kompleksitetin që nuk sjell përfitim.
      `,
      content_en: `
CSS architecture defines how styles are organized, named, separated, and maintained.

A good architecture provides predictability, reuse, isolation, scalability, maintainability, and visual consistency.

A single stylesheet can work for a small project. Larger applications usually benefit from component-oriented organization, explicit design tokens, and clear boundaries between global and local styles.

The key principle is to match the architecture to the project's actual complexity.
      `,
      examples: [
        {
          title: "Poorly organized CSS",
          title_sq: "CSS i organizuar dobët",
          code: `.red { color: red; }
.big { font-size: 30px; }
.box { padding: 20px; }
.red2 { color: #e11; }`,
          explanation_sq:
            "Emrat përshkruajnë pamjen momentale dhe jo qëllimin. Rregullat mund të dublikohen dhe bëhen të vështira për t'u mirëmbajtur."
        },
        {
          title: "Semantic CSS",
          title_sq: "CSS semantik",
          code: `.alert {
  color: var(--color-danger);
}

.page-title {
  font-size: var(--font-size-2xl);
}

.card {
  padding: var(--space-5);
}`,
          explanation_sq:
            "Emrat shprehin funksionin e elementit, ndërsa vlerat e përbashkëta menaxhohen nga design tokens."
        }
      ],
      best_practices_sq: [
        "Përdor emra që shpjegojnë rolin e komponentit.",
        "Mbaji stilet globale të kufizuara dhe të qëllimshme.",
        "Shmang selektorët tepër të gjatë dhe të ndërvarur.",
        "Mos ndërto një sistem kompleks pa pasur nevojë.",
        "Përcakto rregulla të qarta për kontributet e ekipit."
      ]
    },

    {
      id: "separation-of-concerns",
      title: "Separation of Concerns",
      title_sq: "Ndarja e Përgjegjësive",
      content_sq: `
Ndarja e përgjegjësive do të thotë që secila pjesë e sistemit ka një rol të qartë.

Një ndarje praktike mund të jetë:
- Reset ose normalize: zvogëlon ndryshimet e parazgjedhura midis shfletuesve.
- Tokens: përmban ngjyrat, madhësitë, hapësirat dhe vlerat e përbashkëta.
- Base: përcakton rregullat bazë për body, titujt, lidhjet dhe elementët HTML.
- Layout: menaxhon container-at, grid-et dhe strukturat e faqes.
- Components: përmban stilet e butonave, kartave, formularëve dhe elementëve të ripërdorshëm.
- Utilities: klasa të vogla me një përgjegjësi të vetme.
- Pages: rregulla specifike për faqe të veçanta kur janë të nevojshme.

Këto kategori nuk duhet të jenë domosdoshmërisht dosje të veçanta në çdo projekt. Në aplikacionet moderne, disa kategori mund të jetojnë brenda moduleve të komponentëve.
      `,
      content_en: `
Separation of concerns gives each stylesheet or module a clear responsibility.

Common responsibilities include reset, design tokens, base styles, layout, components, utilities, and page-specific styling.

These categories can be separate files or folders, but they do not need to be separate in every project. Modern component-based applications often keep component styles close to their components.
      `,
      examples: [
        {
          title: "Layered file organization",
          title_sq: "Organizim me shtresa",
          code: `src/
  styles/
    reset.css
    tokens.css
    base.css
    layout.css
    utilities.css
  components/
    Button/
      Button.jsx
      Button.module.css
    Card/
      Card.jsx
      Card.module.css
  pages/
    Home/
      Home.jsx
      Home.module.css`,
          explanation_sq:
            "Struktura e mban CSS-in e përbashkët të ndarë nga stilet lokale të komponentëve."
        }
      ],
      best_practices_sq: [
        "Përdor emra dosjesh që tregojnë përgjegjësinë.",
        "Mbaji stilet specifike pranë komponentit kur kjo ndihmon mirëmbajtjen.",
        "Mos krijo skedarë për çdo rregull të vetëm pa arsye.",
        "Shmang dublimin e të njëjtit sistem bazë në shumë vende."
      ]
    },

    {
      id: "naming-conventions",
      title: "CSS Naming Conventions",
      title_sq: "Konventat e Emërtimit në CSS",
      content_sq: `
Konventat e emërtimit përcaktojnë si quhen klasat dhe identifikuesit CSS.

Emrat e mirë duhet të jenë:
- Kuptimplotë.
- Të qëndrueshëm.
- Të lexueshëm.
- Të lidhur me funksionin ose strukturën.
- Të parashikueshëm për ekipin.

Shembuj të mirë:
.product-card
.product-card__title
.product-card--featured
.form-field
.is-active
.has-error

Shembuj që duhen shmangur:
.red-text
.big-box
.left-div
.thing2

Emrat vizualë si .red-text bëhen problem kur dizajni ndryshon, sepse klasa përshkruan ngjyrën dhe jo arsyen pse elementi ka atë ngjyrë.

Klasa si .is-active ose .has-error përdoren shpesh për gjendje. Duhet të ketë konsistencë në mënyrën si ekipi i përdor.
      `,
      content_en: `
Naming conventions define how CSS classes and identifiers are named.

Good names are meaningful, consistent, readable, and based on a component's role or state.

Semantic names such as .product-card are generally more resilient than purely visual names such as .red-box. State classes like .is-active and .has-error can communicate dynamic UI states clearly.
      `,
      examples: [
        {
          title: "Semantic naming",
          title_sq: "Emërtim semantik",
          code: `.notification {}
.notification__icon {}
.notification__message {}
.notification--warning {}

.is-loading {}
.is-disabled {}
.has-validation-error {}`,
          explanation_sq:
            "Emrat përshkruajnë komponentin, pjesët e tij, variantet dhe gjendjet."
        }
      ],
      best_practices_sq: [
        "Përdor një konventë të vetme në të gjithë projektin.",
        "Mos i përziej emrat me camelCase, snake_case dhe kebab-case pa standard.",
        "Përdor prefikse të qarta për utility classes kur është e nevojshme.",
        "Dokumento kuptimin e klasave të gjendjes.",
        "Mos e lidh emrin e klasës me një vlerë vizuale që mund të ndryshojë."
      ]
    },

    {
      id: "bem-methodology",
      title: "BEM Methodology",
      title_sq: "Metodologjia BEM",
      content_sq: `
BEM do të thotë Block, Element, Modifier.

Block:
Një komponent i pavarur, për shembull .card.

Element:
Një pjesë që i përket bllokut, për shembull .card__title.

Modifier:
Një variant i bllokut ose elementit, për shembull .card--featured.

Sintaksa tipike:
.block {}
.block__element {}
.block--modifier {}

BEM e bën marrëdhënien midis klasave më të qartë dhe zvogëlon varësinë nga struktura e HTML-it.

BEM nuk është e detyrueshme dhe nuk është e vetmja metodologji. Ajo është veçanërisht e dobishme kur projekti përdor klasa globale CSS dhe ka shumë komponentë.
      `,
      content_en: `
BEM stands for Block, Element, Modifier.

A block is an independent component, an element is a part of that block, and a modifier represents a variant or state.

Typical syntax:
.block
.block__element
.block--modifier

BEM makes component relationships explicit and reduces reliance on deeply nested selectors. It is a convention rather than a CSS language feature.
      `,
      examples: [
        {
          title: "BEM component",
          title_sq: "Komponent me BEM",
          code: `<article class="card card--featured">
  <img
    class="card__image"
    src="product.jpg"
    alt="Product"
  />
  <div class="card__body">
    <h2 class="card__title">Product title</h2>
    <p class="card__description">
      Product description.
    </p>
    <button class="card__button">
      View product
    </button>
  </div>
</article>`,
          explanation_sq:
            "card është blloku; card__title është element; card--featured është modifikues."
        },
        {
          title: "BEM styles",
          title_sq: "Stilet BEM",
          code: `.card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.card__title {
  margin: 0;
  font-size: var(--font-size-lg);
}

.card--featured {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.card__button {
  width: 100%;
}`,
          explanation_sq:
            "Secila klasë ka rol të qartë dhe mund të ndryshohet pa u mbështetur në selektorë të thellë."
        }
      ],
      best_practices_sq: [
        "Mos krijo elemente BEM që nuk kanë lidhje me bllokun.",
        "Përdor modifikues për variante të njohura.",
        "Shmang selektorët si .card .card__body h2.",
        "Mos përdor BEM së bashku me disa konventa të tjera pa një arsye të qartë."
      ]
    },

    {
      id: "css-modules",
      title: "CSS Modules and Scoped Styles",
      title_sq: "CSS Modules dhe Stilet e Kufizuara",
      content_sq: `
CSS Modules është një teknikë që kufizon emrat e klasave në një modul. Në mjedise që e mbështesin, klasat lokale transformohen në emra unikë gjatë procesit të ndërtimit.

Kjo ndihmon për të shmangur përplasjet mes klasave si .title që përdoren nga shumë komponentë.

CSS Modules zakonisht importohet nga një komponent JavaScript ose TypeScript:
import styles from "./Card.module.css";

Pastaj përdoret:
className={styles.card}

CSS Modules nuk është pjesë e standardit bazë të CSS-it; mbështetja varet nga mjetet e ndërtimit ose framework-u. CSS-in e zakonshëm mund ta përdorësh edhe pa CSS Modules.
      `,
      content_en: `
CSS Modules scopes class names to individual modules in supported build environments. This reduces collisions between generic class names used by unrelated components.

A component imports its stylesheet and references the generated class mapping. CSS Modules is a tooling feature, not a native CSS language feature.
      `,
      examples: [
        {
          title: "Card.module.css",
          title_sq: "Skedari Card.module.css",
          code: `.card {
  padding: 1.25rem;
  border-radius: 0.75rem;
  background: white;
}

.title {
  margin-block: 0 0.5rem;
  font-weight: 700;
}`,
          explanation_sq:
            "Klasat mund të kenë emra të shkurtër sepse moduli kufizon shtrirjen e tyre."
        },
        {
          title: "React component",
          title_sq: "Komponent React",
          code: `import styles from "./Card.module.css";

export function Card() {
  return (
    <article className={styles.card}>
      <h2 className={styles.title}>
        Example card
      </h2>
    </article>
  );
}`,
          explanation_sq:
            "Komponenti përdor hartën styles për të referuar klasat e modulit."
        }
      ],
      best_practices_sq: [
        "Përdor CSS Modules kur projekti i mbështet dhe izolimi është i dobishëm.",
        "Mbaji emrat e klasave të lexueshëm edhe në module.",
        "Përcakto qartë se cilat stile janë globale.",
        "Mos supozo se CSS Modules funksionon pa konfigurim në çdo projekt."
      ]
    },

    {
      id: "design-tokens",
      title: "Design Tokens",
      title_sq: "Design Tokens — Vlera të Përbashkëta të Dizajnit",
      content_sq: `
Design tokens janë vlera të emërtuara që përfaqësojnë vendimet e dizajnit të një sistemi.

Ato zakonisht përfshijnë:
- Ngjyra.
- Hapësira.
- Tipografi.
- Border radius.
- Hije.
- Gjerësi maksimale.
- Kohëzgjatje animacionesh.
- Breakpoints ose rregulla të tjera responsive.

Në CSS, custom properties janë një mënyrë e zakonshme për t'i implementuar:
--color-primary
--space-4
--radius-lg

Përfitimi kryesor është se një ndryshim i kontrolluar mund të përditësojë shumë komponentë pa ndryshuar çdo deklaratë veçmas.

Emrat duhet të përshkruajnë qëllimin, jo vetëm vlerën. Për shembull, --color-text-muted është më i dobishëm se --gray-600 kur vlera përdoret për tekst dytësor dhe mund të ndryshojë në një temë tjetër.
      `,
      content_en: `
Design tokens are named values that encode shared design decisions.

Typical token categories include color, spacing, typography, radii, shadows, container widths, and animation timing.

CSS custom properties are a common way to implement tokens. Semantic tokens describe purpose, making themes and design changes easier to maintain.
      `,
      examples: [
        {
          title: "Token system",
          title_sq: "Sistem tokens",
          code: `:root {
  /* Colors */
  --color-primary: #5b4bdb;
  --color-text: #202124;
  --color-text-muted: #686b73;
  --color-surface: #ffffff;
  --color-border: #dfe1e6;
  --color-danger: #c62828;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Shape and elevation */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --shadow-sm: 0 1px 3px rgb(0 0 0 / 10%);
  --shadow-md: 0 8px 24px rgb(0 0 0 / 12%);

  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-2xl: 1.875rem;
}`,
          explanation_sq:
            "Vlerat qendrore mund të ripërdoren në të gjithë sistemin e dizajnit."
        },
        {
          title: "Use tokens in components",
          title_sq: "Përdorimi i tokens në komponentë",
          code: `.panel {
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}

.panel__title {
  margin-block: 0 var(--space-3);
  font-size: var(--font-size-lg);
}`,
          explanation_sq:
            "Komponenti nuk ka nevojë të përsërisë vlerat konkrete të dizajnit."
        }
      ],
      best_practices_sq: [
        "Përdor emra semantikë për rolet e ngjyrave.",
        "Mbaj një shkallë të qëndrueshme hapësirash.",
        "Mos krijo token për çdo vlerë të vetme pa përfitim.",
        "Përcakto fallback kur një custom property mund të mungojë.",
        "Dokumento token-at që kanë kuptim të veçantë për ekipin."
      ]
    },

    {
      id: "semantic-vs-primitive-tokens",
      title: "Primitive and Semantic Tokens",
      title_sq: "Tokens Primitivë dhe Semantikë",
      content_sq: `
Një sistem më i pjekur mund të ndajë token-at në dy nivele.

Primitive tokens:
Përfaqësojnë vlera bazë, si ngjyra të një palete:
--purple-600
--gray-900
--space-4

Semantic tokens:
Përshkruajnë përdorimin e vlerës:
--color-primary
--color-text
--color-surface
--space-component-gap

Token-i semantik mund të referojë një token primitiv. Kjo e bën më të lehtë ndryshimin e temës pa ndryshuar çdo komponent.

Mos e ngatërroni këtë ndarje me një kërkesë të detyrueshme. Për projekte të vogla, një nivel i vetëm tokens mund të jetë plotësisht i mjaftueshëm.
      `,
      content_en: `
Primitive tokens describe raw palette values. Semantic tokens describe how those values are used in the interface.

Semantic tokens can reference primitive tokens, allowing themes to change without rewriting component styles. This extra layer is useful for larger design systems but may be unnecessary for small projects.
      `,
      examples: [
        {
          title: "Two-level token mapping",
          title_sq: "Lidhja e dy niveleve të tokens",
          code: `:root {
  /* Primitive tokens */
  --purple-600: #5b4bdb;
  --gray-900: #202124;
  --gray-100: #f3f4f6;
  --white: #ffffff;

  /* Semantic tokens */
  --color-primary: var(--purple-600);
  --color-text: var(--gray-900);
  --color-surface: var(--white);
  --color-surface-muted: var(--gray-100);
}`,
          explanation_sq:
            "Komponentët përdorin token-at semantikë, ndërsa paleta primitive mund të ndryshohet veçmas."
        }
      ],
      best_practices_sq: [
        "Komponentët duhet të përdorin kryesisht token-at semantikë.",
        "Mbaje hartëzimin e token-ave të thjeshtë.",
        "Përdor token-a primitive për paletën bazë.",
        "Mos krijo nivele të shumta abstraksioni pa një rast konkret përdorimi."
      ]
    },

    {
      id: "theming-architecture",
      title: "Theme Architecture",
      title_sq: "Arkitektura e Temave",
      content_sq: `
Temat mund të ndërtohen duke ndryshuar vlerat e CSS custom properties.

Një model i zakonshëm është përdorimi i atributit data-theme në elementin rrënjë:
<html data-theme="dark">

Ose vendosja e atributit në një container specifik.

Përdorimi i token-ave semantikë ndihmon që komponentët të mos kenë nevojë të dinë nëse tema është e çelët apo e errët.

Nëse dëshiron që tema të ndjekë preferencën e sistemit, prefers-color-scheme mund të përdoret si parazgjedhje. Nëse përdoruesi mund të zgjedhë vetë temën, duhet përcaktuar se cila preferencë ka përparësi.
      `,
      content_en: `
Themes can be implemented by overriding CSS custom properties under a root attribute or another container.

Semantic tokens let components use the same declarations across themes. The prefers-color-scheme media feature can provide a system-based default, while an explicit user choice may take precedence when the application supports it.
      `,
      examples: [
        {
          title: "Light and dark themes",
          title_sq: "Tema e çelët dhe e errët",
          code: `:root {
  color-scheme: light;
  --color-text: #202124;
  --color-surface: #ffffff;
  --color-border: #dfe1e6;
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --color-text: #f3f4f6;
  --color-surface: #17181c;
  --color-border: #383a42;
}

body {
  color: var(--color-text);
  background: var(--color-surface);
  border-color: var(--color-border);
}`,
          explanation_sq:
            "Komponentët përdorin të njëjtët token-a; vetëm vlerat ndryshojnë sipas temës."
        },
        {
          title: "System preference fallback",
          title_sq: "Përdorimi i preferencës së sistemit",
          code: `:root {
  color-scheme: light dark;
  --color-text: #202124;
  --color-surface: #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-text: #f3f4f6;
    --color-surface: #17181c;
  }
}`,
          explanation_sq:
            "Ky model respekton preferencën e sistemit, përveç rasteve kur vendoset shprehimisht tema e çelët."
        }
      ],
      best_practices_sq: [
        "Përdor token-a semantikë për ngjyrat e komponentëve.",
        "Testo kontrastin e tekstit në secilën temë.",
        "Mos mbështet vetëm dallimet e ngjyrave për të komunikuar gjendjen.",
        "Përcakto qartë sjelljen kur nuk ka zgjedhje të ruajtur nga përdoruesi."
      ]
    },

    {
      id: "css-cascade-layers",
      title: "CSS Cascade Layers",
      title_sq: "Shtresat e Cascade në CSS",
      content_sq: `
@layer lejon organizimin e rregullave në shtresa të emërtuara dhe ndihmon në menaxhimin e konkurrencës midis stileve.

Shembull i shtresave:
- reset
- base
- components
- utilities
- overrides

Kur deklarohen shtresa të emërtuara, rendi i tyre është i rëndësishëm. Për deklaratat normale, shtresat e deklaruara më vonë kanë përparësi ndaj shtresave të mëparshme, nëse krahasohen deklarata që përndryshe kanë të njëjtin nivel përparësie. Rregullat jashtë shtresave kanë përparësi ndaj deklaratave normale brenda shtresave.

Për deklaratat me !important, rendi i përparësisë së shtresave është i kundërt. Prandaj, mos u mbështet vetëm te intuita; përcakto një rend të qëndrueshëm dhe testo rezultatin.

Cascade layers nuk e zëvendësojnë specifikën dhe origjinën e CSS-it, por shtojnë një nivel të qartë organizimi.
      `,
      content_en: `
The @layer at-rule groups CSS declarations into named cascade layers.

A project might define reset, base, components, utilities, and overrides layers. For normal declarations, later layers outrank earlier layers when the other relevant cascade factors are equal, while normal unlayered author declarations outrank normal layered declarations.

The layer order is reversed for important declarations. Cascade layers complement specificity; they do not remove the cascade.
      `,
      examples: [
        {
          title: "Layer order",
          title_sq: "Rendi i shtresave",
          code: `@layer reset, base, components, utilities;

@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
}

@layer base {
  body {
    margin: 0;
    font-family: system-ui, sans-serif;
  }
}

@layer components {
  .button {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
  }
}

@layer utilities {
  .u-hidden {
    display: none;
  }
}`,
          explanation_sq:
            "Rendi deklarohet në një vend të vetëm dhe e bën më të parashikueshme konkurrencën midis shtresave."
        }
      ],
      best_practices_sq: [
        "Deklaro rendin e shtresave herët në projekt.",
        "Mos vendos pa arsye stile globale jashtë shtresave nëse sistemi mbështetet te @layer.",
        "Kupto përparësinë e !important përpara se ta përdorësh.",
        "Testo ndërveprimin me CSS të palëve të treta."
      ]
    },

    {
      id: "specificity-management",
      title: "Specificity Management",
      title_sq: "Menaxhimi i Specifikës",
      content_sq: `
Arkitektura e mirë synon ta bëjë specifikën të ulët dhe të parashikueshme.

Selektorët e thellë dhe kombinimet e panevojshme të ID-ve krijojnë rregulla që janë të vështira për t'u mbishkruar.

Prefero:
.button {}
.card__title {}

Shmang, kur nuk ka nevojë:
main .page .content article.card h2.title {}
#app #main .button {}

Pseudoklasa :where() ka specifikë zero për selektorët që përmban. Kjo mund të jetë e dobishme për stile bazë që duhen mbishkruar lehtësisht.

:where(.card, .panel) h2 { ... }

Pseudoklasa :is() merr specifikën e selektorit më specifik brenda listës së saj, prandaj nuk sillet njësoj si :where().
      `,
      content_en: `
A maintainable architecture keeps specificity low and predictable.

Deeply nested selectors and unnecessary IDs make overrides harder. The :where() pseudo-class contributes zero specificity for its argument selector list, while :is() takes the specificity of its most specific argument.
      `,
      examples: [
        {
          title: "Low-specificity defaults",
          title_sq: "Rregulla bazë me specifikë të ulët",
          code: `:where(.card, .panel) h2 {
  margin-block-start: 0;
  font-size: 1.25rem;
}

.card__title {
  color: var(--color-text);
}

.card__title--accent {
  color: var(--color-primary);
}`,
          explanation_sq:
            "Stilet bazë mbeten të lehta për t'u mbishkruar me klasa të qarta."
        }
      ],
      best_practices_sq: [
        "Prefero klasa ndaj selektorëve të gjatë të elementeve.",
        "Shmang ID-të për stilim të zakonshëm.",
        "Mos përdor !important për të maskuar probleme të arkitekturës.",
        "Përdor :where() për selektorë bazë që duhet të kenë specifikë të ulët."
      ]
    },

    {
      id: "utility-classes",
      title: "Utility Classes",
      title_sq: "Klasat Utility",
      content_sq: `
Utility class është një klasë e vogël që kryen një detyrë të vetme, për shembull:
.u-hidden
.u-text-center
.u-flex
.u-gap-4

Utilities mund të përshpejtojnë zhvillimin dhe të zvogëlojnë dublimin, sidomos kur përdoren sipas një sistemi të qëndrueshëm.

Megjithatë, nëse çdo element mbushet me shumë klasa të rastësishme, HTML mund të bëhet i vështirë për t'u lexuar. Qëllimi është një sistem i qartë, jo thjesht shumë klasa.

Framework-e si Tailwind CSS përdorin një qasje utility-first, ndërsa projekte të tjera përdorin vetëm një grup të vogël utility classes për nevoja të përbashkëta.
      `,
      content_en: `
A utility class performs one narrowly defined styling task, such as hiding an element, centering text, or applying a spacing value.

Utilities can reduce duplication and speed up development when they follow a consistent system. Too many arbitrary utilities can make markup difficult to understand. Utility-first frameworks are one approach; a small custom utility set is another.
      `,
      examples: [
        {
          title: "Small utility set",
          title_sq: "Grup i vogël utility",
          code: `.u-hidden {
  display: none !important;
}

.u-text-center {
  text-align: center;
}

.u-flex {
  display: flex;
}

.u-items-center {
  align-items: center;
}

.u-gap-4 {
  gap: var(--space-4);
}

.u-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}`,
          explanation_sq:
            "Utility-t e bëjnë një detyrë të qartë. u-visually-hidden mund të mbajë tekst të disponueshëm për teknologjitë ndihmëse, pa e shfaqur vizualisht."
        }
      ],
      best_practices_sq: [
        "Përdor një prefiks të qëndrueshëm për utility classes.",
        "Mbaji utility-t të vogla dhe të dokumentuara.",
        "Përdor !important vetëm kur kontrata e utility-t e kërkon shprehimisht.",
        "Mos e zëvendëso çdo komponent semantik me një varg klasash të pakuptueshme."
      ]
    },

    {
      id: "component-architecture",
      title: "Component-Based CSS",
      title_sq: "CSS i Organizuar sipas Komponentëve",
      content_sq: `
Në aplikacionet me komponentë, si React, Vue ose Svelte, stilet mund të organizohen rreth komponentit që i përdor.

Një komponent zakonisht përmban:
- Strukturën e ndërfaqes.
- Sjelljen ose logjikën e ndërveprimit.
- Stilet e veta.
- Testet dhe dokumentimin, kur janë të nevojshme.

Përfitimi është lokalizimi i ndryshimeve: një zhvillues mund të gjejë më lehtë komponentin dhe stilet përkatëse.

Megjithatë, token-at dhe stilet bazë shpesh duhet të mbeten të përbashkëta. Arkitektura e mirë kombinon ripërdorimin global me izolimin lokal.
      `,
      content_en: `
Component-based CSS organizes styles around the UI components that use them.

A component may keep markup, behavior, styles, tests, and documentation together. This improves discoverability and local reasoning. Shared tokens and global base styles can still be centralized.
      `,
      examples: [
        {
          title: "Feature-oriented structure",
          title_sq: "Strukturë sipas funksionalitetit",
          code: `src/
  app/
    App.jsx
  styles/
    tokens.css
    global.css
  features/
    checkout/
      Checkout.jsx
      Checkout.module.css
      Checkout.test.jsx
    catalog/
      ProductCard.jsx
      ProductCard.module.css
  shared/
    Button/
      Button.jsx
      Button.module.css`,
          explanation_sq:
            "Struktura grupon kodin sipas veçorive dhe komponentëve të ripërdorshëm."
        }
      ],
      best_practices_sq: [
        "Mbaji stilet pranë komponentit kur e përmirëson zbulueshmërinë.",
        "Nxirr jashtë vetëm vlerat dhe modelet që vërtet ndahen.",
        "Shmang varësitë e fshehta midis komponentëve.",
        "Përcakto qartë stilimin global dhe stilimin lokal."
      ]
    },

    {
      id: "css-import-strategy",
      title: "CSS Loading and Import Strategy",
      title_sq: "Strategjia e Importimit dhe Ngarkimit të CSS-it",
      content_sq: `
CSS mund të ngarkohet përmes elementit link në HTML, direktivës @import ose importimeve të mbështetura nga sistemi i ndërtimit.

Për stilin kryesor të faqes, link rel="stylesheet" është një zgjedhje e zakonshme dhe e drejtpërdrejtë.

@import është i vlefshëm në CSS, por importimet e zinxhirëzuara mund të vonojnë zbulimin dhe ngarkimin e disa burimeve. Në aplikacionet moderne, importet e menaxhuara nga bundler-i mund të përpunohen dhe optimizohen gjatë ndërtimit.

Për komponentët e rëndësishëm vizualisht, kontrollo ngarkimin e CSS-it për të shmangur FOUC (Flash of Unstyled Content), pra shfaqjen e përkohshme të përmbajtjes pa stile.
      `,
      content_en: `
CSS can be loaded through HTML link elements, CSS @import, or a build system's import mechanism.

A stylesheet link is a straightforward option for primary styles. Chained @import rules can delay discovery of resources, while modern build tools may process imports and optimize bundles.

Check critical rendering paths and avoid flashes of unstyled content where possible.
      `,
      examples: [
        {
          title: "HTML stylesheet link",
          title_sq: "Lidhja e skedarit CSS në HTML",
          code: `<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <link rel="stylesheet" href="/styles/main.css" />
  <title>Application</title>
</head>`,
          explanation_sq:
            "Skedari kryesor lidhet drejtpërdrejt nga dokumenti HTML."
        }
      ],
      best_practices_sq: [
        "Ngarko herët stilet që nevojiten për përmbajtjen fillestare.",
        "Mos krijo zinxhirë të gjatë importesh pa arsye.",
        "Përdor optimizimet e sistemit të ndërtimit kur janë të disponueshme.",
        "Verifiko mënyrën si ngarkohen stilet në mjedisin real të prodhimit."
      ]
    },

    {
      id: "css-naming-states",
      title: "Component Variants and States",
      title_sq: "Variantet dhe Gjendjet e Komponentëve",
      content_sq: `
Komponentët shpesh kanë variante dhe gjendje të ndryshme.

Variante:
- primary
- secondary
- danger
- compact
- featured

Gjendje:
- active
- disabled
- loading
- expanded
- invalid

Këto gjendje mund të shprehen përmes klasave, atributeve ARIA, atributeve data-* ose pseudoklasave të CSS-it, në varësi të kuptimit.

Për shembull, :disabled pasqyron gjendjen reale të një kontrolli HTML të çaktivizuar. Një klasë .is-disabled është vetëm një shenjë vizuale nëse nuk lidhet me sjelljen përkatëse.

Gjendja semantike dhe pamja vizuale duhet të jenë në përputhje.
      `,
      content_en: `
Components often expose variants and states such as primary, secondary, compact, loading, expanded, and invalid.

Use native pseudo-classes and semantic attributes where appropriate. A visual class alone does not make a control functionally disabled. Ensure styling reflects the component's actual behavior and accessible state.
      `,
      examples: [
        {
          title: "Variants and native state",
          title_sq: "Variantet dhe gjendja native",
          code: `.button {
  background: var(--color-primary);
  color: white;
}

.button--secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.button[aria-expanded="true"] {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}`,
          explanation_sq:
            "Variantet përdorin modifikues; gjendjet pasqyrojnë atribute reale të elementit."
        }
      ],
      best_practices_sq: [
        "Përdor elementët HTML të duhur për sjelljen native.",
        "Mos përdor vetëm ngjyrën për të komunikuar një gjendje.",
        "Mbaji variantet të kufizuara dhe të dokumentuara.",
        "Sigurohu që stilet focus dhe disabled të jenë të dallueshme."
      ]
    },

    {
      id: "responsive-design-tokens",
      title: "Responsive Design Tokens",
      title_sq: "Design Tokens për Dizajn Responsive",
      content_sq: `
Dizajni responsive mund të përfitojë nga tokens që ndryshojnë sipas madhësisë së ekranit.

Për shembull, madhësia e hapësirave ose gjerësia e container-it mund të ndryshojë në breakpoint-e të caktuara.

Mos e lidh çdo token me një breakpoint vetëm sepse është e mundur. Përdor ndryshime aty ku përmirësojnë paraqitjen dhe lexueshmërinë.
      `,
      content_en: `
Responsive design can use tokens that change at selected breakpoints, such as container widths or spacing scales.

Do not make every token responsive by default. Introduce breakpoint-specific values when they improve readability and layout.
      `,
      examples: [
        {
          title: "Responsive container token",
          title_sq: "Token responsive për container",
          code: `:root {
  --page-gutter: 1rem;
  --content-max: 70rem;
}

@media (min-width: 48rem) {
  :root {
    --page-gutter: 2rem;
  }
}

.page-container {
  width: min(
    calc(100% - 2 * var(--page-gutter)),
    var(--content-max)
  );
  margin-inline: auto;
}`,
          explanation_sq:
            "Hapësira anësore ndryshon sipas ekranit, ndërsa container-i ruan një gjerësi maksimale."
        }
      ],
      best_practices_sq: [
        "Nis nga përmbajtja dhe nevojat e layout-it.",
        "Përdor një grup të vogël breakpoint-esh të dokumentuara.",
        "Testo gjerësitë ndërmjet breakpoint-eve.",
        "Shmang ndryshimin e panevojshëm të shumë token-ave në çdo breakpoint."
      ]
    },

    {
      id: "css-documentation",
      title: "CSS Documentation and Governance",
      title_sq: "Dokumentimi dhe Qeverisja e CSS-it",
      content_sq: `
Në ekipe, arkitektura nuk mjafton pa dokumentim dhe rregulla të përbashkëta.

Dokumentimi mund të përfshijë:
- Emrat dhe qëllimin e token-ave.
- Konventën e klasave.
- Organizimin e dosjeve.
- Mënyrën e krijimit të komponentëve të rinj.
- Rregullat për tema.
- Rregullat e aksesueshmërisë.
- Mënyrën e testimit dhe kontrollit të cilësisë.

Dokumentimi duhet të jetë praktik dhe i përditësuar. Një dokument shumë i gjatë që nuk përdoret nuk e ndihmon ekipin.
      `,
      content_en: `
Teams need shared conventions and documentation in addition to a technical architecture.

Document tokens, naming conventions, folder structure, component creation, theming, accessibility, and quality checks. Keep the documentation practical and aligned with the actual codebase.
      `,
      examples: [
        {
          title: "Example team rules",
          title_sq: "Shembull rregullash të ekipit",
          code: `/*
CSS conventions:
1. Use kebab-case class names.
2. Prefer semantic component names.
3. Keep specificity low.
4. Use design tokens for shared values.
5. Keep component styles near their component.
6. Avoid !important unless justified.
7. Include visible keyboard focus styles.
*/`,
          explanation_sq:
            "Rregullat e shkurtra dhe të qarta ndihmojnë ekipin të ruajë konsistencën."
        }
      ],
      best_practices_sq: [
        "Mbaji rregullat të zbatueshme dhe të matshme.",
        "Përditëso dokumentimin kur ndryshon arkitektura.",
        "Përdor linting automatik për rregullat që mund të kontrollohen.",
        "Mos e zëvendëso komunikimin e ekipit me dokumente të tepërta."
      ]
    },

    {
      id: "stylelint-and-quality",
      title: "Stylelint and Automated Quality",
      title_sq: "Stylelint dhe Kontrolli Automatik i Cilësisë",
      content_sq: `
Linter-at kontrollojnë kodin kundrejt një grupi rregullash. Stylelint përdoret për CSS dhe sintaksa të lidhura si SCSS.

Mund të zbulojë:
- Gabime sintaksore ose modele problematike.
- Konventa të papajtueshme.
- Dublikime të dyshimta.
- Formate të paqëndrueshme.
- Përdorim të ndaluar të disa konstrukteve.

Linter-i nuk zëvendëson testimin vizual ose kontrollin e aksesueshmërisë. Ai është një pjesë e pipeline-it të cilësisë.
      `,
      content_en: `
Stylelint checks CSS against a configurable set of rules. It can enforce conventions and flag suspicious or inconsistent patterns.

Linting complements, rather than replaces, visual testing, browser testing, accessibility checks, and code review.
      `,
      examples: [
        {
          title: "Illustrative Stylelint configuration",
          title_sq: "Konfigurim ilustrues i Stylelint",
          code: `{
  "rules": {
    "color-no-invalid-hex": true,
    "declaration-block-no-duplicate-properties": true,
    "selector-max-id": 0,
    "no-duplicate-selectors": true
  }
}`,
          explanation_sq:
            "Ky është shembull ilustrues; rregullat dhe formati i konfigurimit duhet të përshtaten me versionin dhe konfigurimin e përdorur."
        }
      ],
      best_practices_sq: [
        "Përdor rregulla që përputhen me stilin e ekipit.",
        "Integroni linting në procesin e zhvillimit.",
        "Rregullo problemet e rëndësishme, jo vetëm formatimin.",
        "Rishiko konfigurimin kur ndryshojnë mjetet ose standardet e projektit."
      ]
    },

    {
      id: "css-architecture-anti-patterns",
      title: "CSS Architecture Anti-Patterns",
      title_sq: "Modele të Dëmshme në Arkitekturën CSS",
      content_sq: `
Anti-pattern-et e zakonshme përfshijnë:

1. !important kudo:
   E bën më të vështirë kuptimin e cascade-it.

2. Selektorë tepër të thellë:
   Krijojnë varësi nga struktura e HTML-it.

3. Emra të lidhur vetëm me ngjyrën ose madhësinë:
   E vështirësojnë ndryshimin e dizajnit.

4. Skedarë globalë gjigantë:
   E bëjnë të vështirë gjetjen e përgjegjësisë së çdo rregulli.

5. Shumë nivele abstraksioni:
   E bëjnë sistemin më të ndërlikuar sesa kërkon projekti.

6. Dublikim i token-ave:
   Vlerat e njëjta fillojnë të ndryshojnë pa qëllim.

7. Përzierje e shumë metodologjive:
   Ekipi nuk e di cilën konventë duhet të ndjekë.

8. Stile që nuk testohen në gjendje reale:
   Gabimet mund të shfaqen vetëm në ekrane ose tema të caktuara.
      `,
      content_en: `
Common anti-patterns include excessive !important, deeply nested selectors, purely visual class names, giant global stylesheets, unnecessary abstraction layers, duplicated tokens, inconsistent methodologies, and insufficient real-world testing.

A healthy architecture reduces accidental complexity and makes changes easier to predict.
      `,
      examples: [
        {
          title: "Avoid excessive specificity",
          title_sq: "Shmang specifikën e tepruar",
          code: `/* Avoid */
body .app main .content .card h2.title {
  color: red !important;
}

/* Prefer */
.card__title {
  color: var(--color-text);
}

.card__title--accent {
  color: var(--color-primary);
}`,
          explanation_sq:
            "Emërtimi i qartë dhe specifika e ulët janë më të lehta për t'u mirëmbajtur."
        }
      ],
      best_practices_sq: [
        "Kërko shkakun e konfliktit përpara se të shtosh !important.",
        "Thjeshto selektorët kur është e mundur.",
        "Fshi rregullat e papërdorura pas verifikimit.",
        "Mat performancën dhe kompleksitetin para optimizimeve të panevojshme."
      ]
    },

    {
      id: "choosing-an-architecture",
      title: "Choosing the Right Architecture",
      title_sq: "Zgjedhja e Arkitekturës së Duhur",
      content_sq: `
Nuk ekziston një arkitekturë e vetme që është më e mira për çdo projekt.

Projekt i vogël:
- Një skedar bazë.
- Tokens të thjeshtë.
- Klasa semantike.
- Pak utility classes.

Projekt me shumë faqe:
- Ndarje në reset, base, layout dhe components.
- Konventa emërtimi.
- Tokens të përbashkëta.
- Kontroll i specifikës.

Aplikacion i madh me komponentë:
- Stile lokale ose CSS Modules.
- Tokens dhe tema qendrore.
- Rregulla të dokumentuara.
- Linting dhe testim.
- Strategji për CSS të palëve të treta.

Zgjedhja duhet të bazohet te madhësia e ekipit, mjetet, ripërdorimi, kompleksiteti dhe kërkesat e mirëmbajtjes.
      `,
      content_en: `
There is no universally best CSS architecture.

Small projects can use a simple stylesheet and a few tokens. Multi-page sites may need clear layers and naming conventions. Large component-driven applications often benefit from local styles, shared tokens, theme support, linting, and documented standards.

Choose the smallest architecture that reliably supports the project's current needs and likely growth.
      `,
      examples: [
        {
          title: "Architecture decision checklist",
          title_sq: "Listë kontrolli për zgjedhjen e arkitekturës",
          code: `/*
Before choosing an approach:
- How many components share styles?
- Are multiple developers working in parallel?
- Are themes required?
- Does the build tool support CSS Modules?
- Are global styles causing collisions?
- Can the team maintain the chosen conventions?
- Is the added complexity justified?
*/`,
          explanation_sq:
            "Lista ndihmon të zgjidhet një zgjidhje e përshtatshme pa ndërtuar abstraksione të panevojshme."
        }
      ],
      best_practices_sq: [
        "Nis me një sistem të thjeshtë dhe zgjeroje kur ka nevojë.",
        "Merr parasysh aftësitë dhe mjetet e ekipit.",
        "Dokumento arsyet e vendimeve të rëndësishme.",
        "Rishiko arkitekturën kur problemet reale e justifikojnë."
      ]
    },

    {
      id: "global-vs-local-css",
      title: "Global CSS vs Local CSS",
      title_sq: "CSS Global kundrejt CSS-it Lokal",
      content_sq: `
CSS global ndikon në të gjithë dokumentin ose në një pjesë të madhe të tij.
CSS lokal synon një komponent, modul ose zonë të kufizuar.

CSS global përdoret zakonisht për:
- Reset dhe normalize.
- Fontet bazë.
- Design tokens.
- Stilet bazë të dokumentit.
- Rregullat e përbashkëta të aksesueshmërisë.

CSS lokal përdoret zakonisht për:
- Butona.
- Karta.
- Formularë.
- Menu.
- Komponentë të veçantë të aplikacionit.

Problemi shfaqet kur një stil global ndryshon papritur pamjen e një komponenti të pavarur.

Një arkitekturë e mirë përcakton se cilat klasa janë publike, cilat janë lokale dhe cilat vlera duhet të vijnë nga design tokens.
    `,
    content_en: `
Global CSS affects the document broadly, while local CSS targets a component, module, or limited region.

Global styles typically define resets, fonts, design tokens, and document defaults. Local styles define component-specific presentation.

A clear boundary between global and local styles reduces unintended side effects.
    `,
    examples: [
      {
        title: "Global styles",
        title_sq: "Stilet globale",
        code: `:root {
  --color-text: #202124;
  --color-surface: #ffffff;
  --font-body: system-ui, sans-serif;
}

body {
  margin: 0;
  color: var(--color-text);
  background: var(--color-surface);
  font-family: var(--font-body);
}

img {
  max-width: 100%;
}`,
        explanation_sq:
          "Këto rregulla përcaktojnë bazën e dokumentit dhe elementeve të zakonshme."
      },
      {
        title: "Local component styles",
        title_sq: "Stilet lokale të komponentit",
        code: `.profile-card {
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 1rem;
}

.profile-card__name {
  margin: 0;
}`,
        explanation_sq:
          "Stilet përshkruajnë komponentin konkret, pa ndryshuar të gjithë titujt ose kartat në aplikacion."
      }
    ],
    best_practices_sq: [
      "Mbaj reset-in dhe token-at në një zonë të përbashkët.",
      "Mos përdor selektorë globalë për të stiluar vetëm një komponent.",
      "Dokumento përjashtimet kur një komponent kërkon stil global.",
      "Kontrollo ndikimin e ndryshimeve globale në të gjithë aplikacionin."
    ]
  },

  {
    id: "itcss-architecture",
    title: "ITCSS Architecture",
    title_sq: "Arkitektura ITCSS",
    content_sq: `
ITCSS do të thotë Inverted Triangle CSS.

Është një metodologji organizimi që fillon me rregullat më të përgjithshme dhe kalon gradualisht te rregullat më specifike.

Një rend i zakonshëm është:
1. Settings: konfigurime dhe tokens.
2. Tools: mixins dhe funksione të procesorëve CSS, kur përdoren.
3. Generic: reset dhe rregulla të përgjithshme.
4. Elements: stile të elementeve HTML.
5. Objects: modele layout-i të ripërdorshme.
6. Components: komponentët konkretë.
7. Utilities: klasa me përparësi të përcaktuar.

Kjo metodologji ndihmon të kontrollohet rritja e specifikës dhe të ndahet CSS-i sipas nivelit të përgjegjësisë.

Jo çdo projekt ka nevojë për të gjitha shtresat. Përdor vetëm ato që ndihmojnë strukturën reale të projektit.
    `,
    content_en: `
ITCSS organizes CSS from broad, low-specificity rules toward more specific component and utility rules.

Common layers include settings, tools, generic styles, elements, objects, components, and utilities.

The method helps teams reason about scope and specificity, but projects can omit layers that do not provide practical value.
    `,
    examples: [
      {
        title: "ITCSS folder structure",
        title_sq: "Struktura e dosjeve ITCSS",
        code: `styles/
  01-settings/
    tokens.css
  02-tools/
    helpers.scss
  03-generic/
    reset.css
  04-elements/
    elements.css
  05-objects/
    containers.css
    media-object.css
  06-components/
    button.css
    card.css
    navigation.css
  07-utilities/
    utilities.css`,
        explanation_sq:
          "Numrat e dosjeve shprehin rendin e organizimit; nuk janë kërkesë e vetë CSS-it."
      }
    ],
    best_practices_sq: [
      "Mbaj specifikën sa më të ulët në shtresat e përgjithshme.",
      "Mos përziej komponentët me reset-in.",
      "Përcakto qartë rendin e ngarkimit.",
      "Përdor metodologjinë vetëm kur kompleksiteti i projektit e justifikon."
    ]
  },

  {
    id: "smacss-architecture",
    title: "SMACSS Architecture",
    title_sq: "Arkitektura SMACSS",
    content_sq: `
SMACSS do të thotë Scalable and Modular Architecture for CSS.

Ajo i ndan rregullat CSS në kategori:
- Base: stile bazë për elementet HTML.
- Layout: struktura kryesore e faqes.
- Module: komponentë të ripërdorshëm.
- State: gjendje si active, expanded ose hidden.
- Theme: stile që ndryshojnë sipas temës.

Kjo ndarje është veçanërisht e dobishme kur projekti ka shumë faqe dhe komponentë me role të përsëritura.

SMACSS është një metodologji, jo veçori e gjuhës CSS. Mund të përshtatet me BEM, CSS Modules ose CSS Cascade Layers.
    `,
    content_en: `
SMACSS categorizes CSS into base, layout, module, state, and theme rules.

It helps teams separate document defaults from page structure, reusable modules, component states, and theme-specific styles.

SMACSS is a flexible methodology rather than a built-in CSS feature.
    `,
    examples: [
      {
        title: "SMACSS naming",
        title_sq: "Emërtimi sipas SMACSS",
        code: `/* Layout */
.l-container {
  width: min(100% - 2rem, 72rem);
  margin-inline: auto;
}

/* Module */
.card {
  padding: 1.25rem;
  border-radius: 0.75rem;
}

/* State */
.is-expanded {
  max-height: 40rem;
}

/* Theme */
.theme-dark {
  --color-surface: #17181c;
  --color-text: #f3f4f6;
}`,
        explanation_sq:
          "Prefikset dhe kategoritë e bëjnë rolin e klasave më të qartë për ekipin."
      }
    ],
    best_practices_sq: [
      "Përdor kategoritë si udhëzim, jo si rregull absolut.",
      "Mbaji gjendjet të lidhura me sjelljen e komponentit.",
      "Shmang krijimin e dy sistemeve paralele që zgjidhin të njëjtin problem.",
      "Dokumento prefikset e përdorura."
    ]
  },

  {
    id: "css-solid-principles",
    title: "SOLID-Inspired CSS Design",
    title_sq: "Parimet SOLID të Zbatuara në Dizajnin CSS",
    content_sq: `
SOLID u krijua kryesisht për dizajnin e programeve objekt-orientuese, por disa ide mund të përshtaten edhe në arkitekturën CSS.

Këto nuk janë rregulla zyrtare të CSS-it.

Single Responsibility:
Një komponent duhet të ketë një rol të kuptueshëm. Shmang klasat që përpiqen të menaxhojnë shumë përgjegjësi të palidhura.

Open/Closed:
Prefero variante të qarta dhe tokens që lejojnë zgjerimin pa ndryshuar vazhdimisht stilet bazë.

Liskov Substitution:
Komponentët që zëvendësojnë njëri-tjetrin duhet të ruajnë kontratën vizuale dhe funksionale që pritet prej tyre.

Interface Segregation:
Komponentët nuk duhet të varen nga shumë klasa ose konfigurime që nuk u nevojiten.

Dependency Inversion:
Komponentët duhet të varen nga kontrata të qëndrueshme, si token-at semantikë, në vend që të lidhen fort me vlera konkrete të paletës.
    `,
    content_en: `
SOLID originates in object-oriented software design, but some ideas can inform CSS architecture.

Use focused component responsibilities, explicit variants, stable component contracts, minimal configuration requirements, and semantic tokens instead of hard-coded implementation details.

These are design analogies, not official CSS language rules.
    `,
    examples: [
      {
        title: "A focused component",
        title_sq: "Komponent me përgjegjësi të qartë",
        code: `.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: white;
}

.button--secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}`,
        explanation_sq:
          "Komponenti ka një rol të qartë dhe variantet ndryshojnë vetëm karakteristikat përkatëse."
      }
    ],
    best_practices_sq: [
      "Mbaji komponentët të fokusuar.",
      "Prefero variante të dokumentuara në vend të kombinimeve arbitrare.",
      "Përdor token-a semantikë si pikë të qëndrueshme integrimi.",
      "Mos e paraqit analogjinë SOLID si standard të detyrueshëm CSS."
    ]
  },

  {
    id: "component-contracts",
    title: "Component Contracts",
    title_sq: "Kontratat e Komponentëve",
    content_sq: `
Kontrata e komponentit përcakton se si përdoret komponenti dhe çfarë mund të pritet prej tij.

Një kontratë mund të përfshijë:
- Emrin dhe qëllimin.
- Strukturën semantike HTML.
- Variantet e mbështetura.
- Gjendjet.
- Sjelljen responsive.
- Token-at që përdor.
- Sjelljen e fokusit dhe aksesueshmërinë.
- Kufijtë e personalizimit.

Për shembull, një komponent Button mund të ofrojë variantet primary, secondary dhe danger, ndërsa përmasat small, medium dhe large.

Një sistem i kontrolluar variantësh është më i lehtë për t'u mirëmbajtur se një numër i pakufizuar klasash të rastësishme.
    `,
    content_en: `
A component contract describes how a component is used and what behavior consumers can expect.

It may define semantic markup, supported variants, states, responsive behavior, design tokens, accessibility behavior, and customization boundaries.

Explicit contracts reduce ambiguity and make component libraries easier to maintain.
    `,
    examples: [
      {
        title: "Button contract example",
        title_sq: "Shembull i kontratës Button",
        code: `/*
Component: Button

Variants:
- primary
- secondary
- danger

Sizes:
- small
- medium
- large

States:
- hover
- focus-visible
- disabled

Requirements:
- Use a native button for actions.
- Preserve visible keyboard focus.
- Do not communicate meaning through color alone.
- Use design tokens for shared values.
*/`,
        explanation_sq:
          "Kontrata përshkruan përdorimin e lejuar dhe kërkesat që duhet të plotësojë komponenti."
      }
    ],
    best_practices_sq: [
      "Dokumento vetëm variantet që mbështeten realisht.",
      "Mbaj kontratat konsistente në komponentët e ngjashëm.",
      "Mos lejo që klasat e brendshme të bëhen API publike pa nevojë.",
      "Testo kontratën kur ndryshon një komponent i ripërdorshëm."
    ]
  },

  {
    id: "css-dependency-management",
    title: "CSS Dependency Management",
    title_sq: "Menaxhimi i Varësive të CSS-it",
    content_sq: `
Në aplikacione të mëdha, CSS-i mund të vijë nga kodi i projektit, framework-et, bibliotekat e komponentëve dhe widget-et e palëve të treta.

Varësitë mund të shkaktojnë:
- Përplasje emrash klasash.
- Ndryshime të papritura të specifikës.
- Rregulla të dyfishta.
- Rritje të madhësisë së CSS-it.
- Ndryshime vizuale pas përditësimeve të bibliotekave.

Strategjitë e menaxhimit përfshijnë:
- Izolimin e klasave lokale.
- Emra të qëndrueshëm dhe unikë.
- CSS Cascade Layers, kur mbështeten.
- Dokumentimin e CSS-it global.
- Testimin pas përditësimeve.
- Heqjen e varësive të papërdorura.

Mos e mbishkruaj menjëherë një stil të bibliotekës me selektorë gjithnjë e më specifikë. Kontrollo fillimisht nëse biblioteka ofron API për tema ose personalizim.
    `,
    content_en: `
Large applications combine first-party styles with frameworks, component libraries, and third-party widgets.

Dependency conflicts can create class collisions, specificity problems, duplicate rules, bundle growth, and unexpected visual changes.

Prefer supported customization APIs, clear style boundaries, and regression testing over increasingly specific overrides.
    `,
    examples: [
      {
        title: "Layered third-party CSS",
        title_sq: "CSS i palëve të treta në shtresa",
        code: `@layer reset, vendor, base, components, utilities;

@import url("/styles/vendor.css") layer(vendor);

@layer base {
  body {
    font-family: system-ui, sans-serif;
  }
}

@layer components {
  .app-card {
    border-radius: var(--radius-lg);
  }
}`,
        explanation_sq:
          "Sintaksa layer(vendor) lejon vendosjen e importit në një shtresë të caktuar. Kontrollo rendin dhe mbështetjen e mjedisit të synuar."
      }
    ],
    best_practices_sq: [
      "Prefero API-të zyrtare të personalizimit të bibliotekave.",
      "Kontrollo përplasjet e klasave në DevTools.",
      "Testo ndryshimet pas përditësimit të varësive.",
      "Mos përdor !important si zgjidhje automatike për çdo konflikt."
    ]
  },

  {
    id: "css-migration-strategy",
    title: "CSS Migration and Refactoring",
    title_sq: "Migrimi dhe Ristrukturimi i CSS-it",
    content_sq: `
Migrimi i CSS-it është procesi i ndryshimit të arkitekturës pa prishur ndërfaqen ekzistuese.

Një strategji e sigurt përfshin:
1. Inventarizimin e skedarëve dhe klasave ekzistuese.
2. Identifikimin e dublimeve dhe konflikteve.
3. Vendosjen e një standardi të ri emërtimi.
4. Krijimin e tokens bazë.
5. Migrimin gradual të komponentëve.
6. Testimin e faqeve pas çdo grupi ndryshimesh.
7. Heqjen e kodeve të vjetra vetëm pasi të konfirmohet se nuk përdoren.

Një rishkrim i plotë mund të jetë i përshtatshëm në raste të caktuara, por migrimi gradual shpesh e zvogëlon rrezikun në aplikacionet që janë tashmë në përdorim.
    `,
    content_en: `
CSS migration changes an existing style architecture without breaking the interface.

Inventory current styles, identify duplication, define new conventions, introduce tokens, migrate components incrementally, run regression checks, and remove old styles only after confirming they are unused.

Incremental migration often reduces risk in active applications.
    `,
    examples: [
      {
        title: "Safe migration checklist",
        title_sq: "Listë kontrolli për migrim të sigurt",
        code: `/*
1. Record baseline screenshots.
2. Inventory existing selectors.
3. Define naming and token conventions.
4. Migrate one component at a time.
5. Check responsive layouts.
6. Check keyboard focus and interaction states.
7. Remove obsolete rules after verification.
8. Compare production output.
*/`,
        explanation_sq:
          "Lista e kontrollit ndihmon që ristrukturimi të mos bëhet pa verifikim."
      }
    ],
    best_practices_sq: [
      "Mos i riemërto të gjitha klasat pa plan.",
      "Ruaj funksionimin e ndërfaqes gjatë migrimit.",
      "Përdor kontrolle vizuale dhe funksionale.",
      "Ndrysho një grup të kufizuar komponentësh për çdo fazë."
    ]
  },

  {
    id: "visual-regression-testing",
    title: "Visual Regression Testing",
    title_sq: "Testimi i Regresionit Vizual",
    content_sq: `
Testimi i regresionit vizual krahason pamjen e ndërfaqes para dhe pas ndryshimeve.

Ai mund të zbulojë:
- Ndryshime të papritura në hapësira.
- Përmbajtje që mbivendoset.
- Ngjyra të ndryshuara.
- Layout të prishur.
- Probleme që shfaqen vetëm në breakpoint-e të caktuara.
- Ndryshime pas përditësimeve të bibliotekave.

Pamjet e krahasuara duhet të krijohen në kushte sa më të qëndrueshme: madhësi e njëjtë viewport-i, të dhëna të njëjta dhe gjendje e njëjtë e ndërfaqes.

Testimi vizual nuk zëvendëson testet funksionale, testet e aksesueshmërisë ose verifikimin në shfletues.
    `,
    content_en: `
Visual regression testing compares rendered screenshots before and after code changes.

It can detect unexpected changes in spacing, colors, layout, overflow, and responsive behavior. Reliable comparisons require consistent viewport dimensions, data, fonts, and UI states.

Visual testing complements functional and accessibility testing.
    `,
    examples: [
      {
        title: "Visual testing matrix",
        title_sq: "Matrica e testimit vizual",
        code: `/*
Component: ProductCard

Viewports:
- 375px mobile
- 768px tablet
- 1280px desktop

States:
- default
- hover
- keyboard focus
- loading
- unavailable

Themes:
- light
- dark
*/`,
        explanation_sq:
          "Matrica përcakton madhësitë dhe gjendjet ku duhet verifikuar pamja e komponentit."
      }
    ],
    best_practices_sq: [
      "Përdor viewport-e përfaqësuese.",
      "Testo gjendjet e ndërveprimit, jo vetëm gjendjen fillestare.",
      "Shmang ndryshimet e panevojshme të të dhënave midis pamjeve.",
      "Shqyrto ndryshimet e raportuara përpara se t'i pranosh."
    ]
  },

  {
    id: "css-performance-and-bundle-size",
    title: "CSS Performance and Bundle Size",
    title_sq: "Performanca e CSS-it dhe Madhësia e Bundle-it",
    content_sq: `
Madhësia dhe mënyra e ngarkimit të CSS-it mund të ndikojnë në kohën kur ndërfaqja bëhet e paraqitshme.

Pikat kryesore:
- Hiq rregullat e papërdorura pasi të verifikosh se nuk nevojiten.
- Shmang dublimin e komponentëve dhe utility-ve.
- Përdor minifikimin në prodhim.
- Ngarko vetëm CSS-in që nevojitet për faqet ose komponentët përkatës, kur infrastruktura e mbështet.
- Mos krijo selektorë tepër kompleksë pa arsye.
- Mat rezultatet përpara se të optimizosh.

Shfletuesit janë të optimizuar për shumë selektorë CSS të zakonshëm. Prandaj, selektorët nuk duhen thjeshtuar vetëm nga frika e performancës; syno qartësi dhe mat ndikimin real.

CSS kritike mund të ndihmojë renderimin fillestar në raste të caktuara, por duhet përdorur me kujdes për të shmangur dublimin dhe kompleksitetin e tepërt.
    `,
    content_en: `
CSS loading and bundle size can affect rendering performance.

Remove verified unused rules, avoid duplication, minify production assets, and consider route- or component-level loading where supported. Measure before optimizing: ordinary selectors are generally efficient, so maintainability should remain a primary goal.
    `,
    examples: [
      {
        title: "Production checklist",
        title_sq: "Listë kontrolli për prodhim",
        code: `/*
Production CSS checks:
- Minification enabled
- Unused CSS reviewed
- Duplicate rules reviewed
- Critical rendering path reviewed
- Stylesheet caching configured
- Responsive layouts tested
- Source maps configured appropriately
*/`,
        explanation_sq:
          "Lista mbulon disa kontrolle praktike para publikimit të aplikacionit."
      }
    ],
    best_practices_sq: [
      "Mat madhësinë reale të CSS-it të prodhimit.",
      "Mos fshi rregulla dinamike pa verifikuar përdorimin e tyre.",
      "Përdor cache dhe versionim të aseteve kur është e përshtatshme.",
      "Mos sakrifiko lexueshmërinë vetëm për optimizime të pamatura."
    ]
  },

  {
    id: "css-architecture-final-project",
    title: "Complete CSS Architecture Example",
    title_sq: "Shembull i Plotë i Arkitekturës CSS",
    content_sq: `
Ky shembull përmbledh një arkitekturë praktike për një aplikacion me disa komponentë.

Qëllimi është të ketë:
- Një vend për tokens.
- Një reset të kontrolluar.
- Stile bazë për dokumentin.
- Shtresa të qarta cascade.
- Komponentë me emra semantikë.
- Utilities të kufizuara.
- Një model të qëndrueshëm për tema.

Kjo është një strukturë fillestare. Projektet mund ta përshtatin sipas framework-ut, madhësisë së ekipit dhe kërkesave.
    `,
    content_en: `
This example combines tokens, reset, base styles, cascade layers, semantic components, and a small utility set.

It is a starting architecture that can be adapted to the framework, team size, and maintenance needs of the project.
    `,
    examples: [
      {
        title: "main.css",
        title_sq: "Skedari main.css",
        code: `@layer reset, base, layout, components, utilities;

@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  body,
  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }
}

@layer base {
  :root {
    color-scheme: light;

    --color-primary: #5145cd;
    --color-text: #202124;
    --color-muted: #666b75;
    --color-surface: #ffffff;
    --color-border: #dfe1e6;

    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-6: 1.5rem;
    --space-8: 2rem;

    --radius-md: 0.5rem;
    --radius-lg: 1rem;
    --content-max: 72rem;
  }

  :root[data-theme="dark"] {
    color-scheme: dark;
    --color-text: #f3f4f6;
    --color-muted: #b5b8c1;
    --color-surface: #18191d;
    --color-border: #393b44;
  }

  body {
    min-height: 100vh;
    color: var(--color-text);
    background: var(--color-surface);
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  :focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 3px;
  }
}

@layer layout {
  .l-container {
    width: min(
      calc(100% - 2rem),
      var(--content-max)
    );
    margin-inline: auto;
  }

  .l-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
}

@layer components {
  .card {
    padding: var(--space-6);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .card__title {
    margin-block-end: var(--space-2);
    font-size: 1.25rem;
    font-weight: 700;
  }

  .card__description {
    color: var(--color-muted);
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: #ffffff;
    cursor: pointer;
  }

  .button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .button--secondary {
    border-color: var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
  }
}

@layer utilities {
  .u-text-center {
    text-align: center;
  }

  .u-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`,
        explanation_sq:
          "Shembulli demonstron ndarjen e shtresave, tokens, komponentët BEM, layout utilities, fokusin e dukshëm dhe respektimin e preferencës për lëvizje të reduktuar."
      },
      {
        title: "HTML usage",
        title_sq: "Përdorimi në HTML",
        code: `<main class="l-container l-stack">
  <article class="card">
    <h2 class="card__title">
      XSUS AI
    </h2>

    <p class="card__description">
      A reusable component with consistent design tokens.
    </p>

    <button class="button" type="button">
      Continue
    </button>

    <button
      class="button button--secondary"
      type="button"
    >
      Learn more
    </button>
  </article>
</main>`,
        explanation_sq:
          "HTML përdor klasat e layout-it dhe komponentëve pa pasur nevojë për selektorë të varur nga struktura e thellë."
      }
    ],
    best_practices_sq: [
      "Përshtate paletën e ngjyrave me identitetin e projektit.",
      "Testo kontrastin dhe fokusin në shfletuesit e synuar.",
      "Verifiko mbështetjen e veçorive CSS në mjedisin e projektit.",
      "Mos e kopjo strukturën pa e përshtatur me nevojat reale."
    ]
  },

  {
    id: "css-architecture-final-checklist",
    title: "CSS Architecture Final Checklist",
    title_sq: "Lista Përfundimtare e Kontrollit të Arkitekturës CSS",
    content_sq: `
Para se ta konsiderosh arkitekturën të përfunduar, kontrollo këto pika:

Arkitektura:
- Përgjegjësitë e stileve janë të qarta.
- CSS global dhe lokal janë të ndarë sipas nevojës.
- Konventa e emërtimit është e qëndrueshme.
- Organizimi i dosjeve është i kuptueshëm.

Design system:
- Token-at kanë emra semantikë.
- Ngjyrat, hapësirat dhe tipografia janë konsistente.
- Temat përdorin të njëjtat kontrata komponentësh.
- Variantet e komponentëve janë të dokumentuara.

Cascade:
- Rendi i shtresave është i parashikueshëm.
- Specifika nuk është e panevojshme.
- Përdorimi i !important është i kufizuar dhe i justifikuar.
- Rregullat globale nuk shkaktojnë efekte anësore.

Cilësia:
- CSS-i kontrollohet me linting.
- Ndryshimet vizuale testohen.
- Aksesueshmëria dhe fokusi verifikohen.
- Layout-et testohen në madhësi të ndryshme.
- Kodi i papërdorur hiqet vetëm pas verifikimit.

Mirëmbajtja:
- Dokumentimi pasqyron kodin aktual.
- Zhvilluesit e kuptojnë ku duhet të bëjnë ndryshime.
- Arkitektura nuk është më komplekse sesa kërkon projekti.
    `,
    content_en: `
Before considering the architecture complete, verify clear style responsibilities, consistent naming, semantic tokens, documented component variants, predictable cascade behavior, limited specificity, automated checks, visual regression coverage, accessibility, responsive layouts, and practical documentation.

The final architecture should be understandable, testable, and no more complex than necessary.
    `,
    best_practices_sq: [
      "Përdore këtë listë në review-t e kodit.",
      "Rishikoje pas ndryshimeve të mëdha në design system.",
      "Automatizo kontrollet që mund të verifikohen nga mjetet.",
      "Trajtoje arkitekturën si një sistem që evoluon me projektin."
    ]
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = cssArchitectureKnowledge;
}
