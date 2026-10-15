// ============================================================================
// XSUS AI - CSS FUNDAMENTALS MASTER KNOWLEDGE BASE
// Version: 1.0.0 (Bilingual Structured Engine)
// ============================================================================

export const cssFundamentalsKnowledge = {

  // ==========================================
  // 1. CSS FUNDAMENTALS & SYNTAX
  // ==========================================
  cssFundamentals: {
    title: {
      sq: "Bazat dhe sintaksa e CSS-së",
      en: "CSS Fundamentals and Syntax"
    },

    topics: {
      definition: {
        sq: "CSS (Cascading Style Sheets) është gjuhë stili që kontrollon paraqitjen vizuale të dokumenteve, përfshirë ngjyrat, hapësirat, tipografinë dhe vendosjen e elementeve.",
        en: "CSS (Cascading Style Sheets) is a styling language that controls the visual presentation of documents, including colors, spacing, typography, and element layout."
      },

      rules: {
        sq: "Një rregull CSS përbëhet nga një selektor dhe një bllok deklarimesh. Çdo deklarim përmban një veti dhe një vlerë.",
        en: "A CSS rule consists of a selector and a declaration block. Each declaration contains a property and a value."
      },

      declarations: {
        sq: "Deklarimet shkruhen zakonisht në formën property: value; ku pikëpresja ndan deklarimet.",
        en: "Declarations are generally written as property: value; with semicolons separating declarations."
      },

      comments: {
        sq: "Komentet CSS shkruhen me /* dhe */ dhe nuk zbatohen si deklarime stili.",
        en: "CSS comments are written using /* and */ and are not applied as style declarations."
      },

      cascading: {
        sq: "Cascading përcakton se cilat deklarime përdoren kur disa rregulla synojnë të njëjtën veti të një elementi. Rezultati varet nga origjina, rëndësia, shtresat, specifiteti dhe renditja.",
        en: "The cascade determines which declarations apply when multiple rules target the same property on an element. The result depends on origin, importance, layers, specificity, and order."
      }
    },

    example: `
/* Rregull bazë CSS */
body {
  font-family: Arial, sans-serif;
  color: #222222;
  background-color: #ffffff;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

p {
  line-height: 1.6;
}
`
  },

  // ==========================================
  // 2. APPLYING CSS TO HTML
  // ==========================================
  applyingCSS: {
    title: {
      sq: "Mënyrat e përdorimit të CSS-së",
      en: "Ways to Apply CSS"
    },

    topics: {
      externalStylesheet: {
        sq: "CSS e jashtme ruhet në skedar të veçantë dhe lidhet me HTML përmes elementit <link>. Kjo mënyrë e bën stilimin më të lehtë për t'u ripërdorur dhe mirëmbajtur.",
        en: "External CSS is stored in a separate file and linked to HTML using the <link> element. This makes styles easier to reuse and maintain."
      },

      internalStylesheet: {
        sq: "CSS e brendshme vendoset brenda elementit <style>, zakonisht në seksionin <head> të dokumentit.",
        en: "Internal CSS is placed inside a <style> element, usually in the document's <head> section."
      },

      inlineStyles: {
        sq: "Stilet inline përdorin atributin style në elementin HTML. Ato mund të jenë të dobishme në raste të kufizuara, por përdorimi i tepruar vështirëson mirëmbajtjen.",
        en: "Inline styles use the style attribute on an HTML element. They can be useful in limited cases, but excessive use makes maintenance harder."
      },

      importRule: {
        sq: "@import mundëson përfshirjen e një skedari tjetër CSS. Përfshirja me <link> zakonisht preferohet për stylesheet-et kryesore.",
        en: "@import allows another CSS file to be included. Using <link> is generally preferred for primary stylesheets."
      }
    },

    example: `
/* Përmbajtja e skedarit styles.css */
body {
  margin: 0;
  font-family: Arial, sans-serif;
}

.page-title {
  color: #1d4ed8;
}
`
  },

  // ==========================================
  // 3. BASIC SELECTORS
  // ==========================================
  selectors: {
    title: {
      sq: "Selektorët bazë të CSS-së",
      en: "Basic CSS Selectors"
    },

    topics: {
      universalSelector: {
        sq: "Selektori * synon të gjithë elementet e përfshirë në fushën e tij të përzgjedhjes.",
        en: "The * selector targets all elements within its selection scope."
      },

      elementSelector: {
        sq: "Selektori i elementit, si p ose h1, synon të gjitha elementet përkatëse.",
        en: "An element selector, such as p or h1, targets all matching elements."
      },

      classSelector: {
        sq: "Selektori .class synon elementet që kanë klasën e caktuar. Një klasë mund të përdoret nga shumë elemente.",
        en: "The .class selector targets elements with a specified class. A class can be used by many elements."
      },

      idSelector: {
        sq: "Selektori #id synon elementin me ID-në e caktuar. ID-të duhet të jenë unike brenda dokumentit HTML.",
        en: "The #id selector targets the element with the specified ID. IDs should be unique within an HTML document."
      },

      attributeSelector: {
        sq: "Selektorët e atributeve, si [disabled] ose [type='email'], synojnë elementet sipas atributeve të tyre.",
        en: "Attribute selectors, such as [disabled] or [type='email'], target elements based on their attributes."
      },

      selectorGrouping: {
        sq: "Presja grupon selektorët që duhet të marrin të njëjtat deklarime.",
        en: "A comma groups selectors that should receive the same declarations."
      }
    },

    example: `
/* Selektori universal */
* {
  box-sizing: border-box;
}

/* Selektori i elementit */
p {
  color: #333333;
}

/* Selektori i klasës */
.card {
  padding: 1rem;
}

/* Selektori i ID-së */
#main-header {
  background-color: #f3f4f6;
}

/* Selektori i atributit */
input[type="email"] {
  border: 1px solid #9ca3af;
}

/* Grupimi i selektorëve */
h1,
h2,
h3 {
  line-height: 1.2;
}
`
  },

  // ==========================================
  // 4. COMBINATORS & ADVANCED SELECTORS
  // ==========================================
  combinators: {
    title: {
      sq: "Kombinatorët dhe selektorët e kombinuar",
      en: "Combinators and Combined Selectors"
    },

    topics: {
      descendant: {
        sq: "Hapësira ndërmjet selektorëve zgjedh elementet pasardhëse në çdo nivel brenda elementit prind.",
        en: "A space between selectors targets descendant elements at any depth inside an ancestor."
      },

      child: {
        sq: "Kombinatori > zgjedh vetëm elementet fëmijë të drejtpërdrejtë.",
        en: "The > combinator selects only direct child elements."
      },

      adjacentSibling: {
        sq: "Kombinatori + zgjedh elementin menjëherë pasues që ndan të njëjtin prind.",
        en: "The + combinator selects the immediately following sibling that shares the same parent."
      },

      generalSibling: {
        sq: "Kombinatori ~ zgjedh elementet pasuese që ndajnë të njëjtin prind dhe përputhen me selektorin.",
        en: "The ~ combinator selects following siblings that share the same parent and match the selector."
      },

      notPseudoClass: {
        sq: ":not() përjashton elementet që përputhen me selektorin e dhënë.",
        en: ":not() excludes elements matching the provided selector."
      },

      isWhere: {
        sq: ":is() grupuon selektorë, ndërsa :where() bën diçka të ngjashme me specifitet zero.",
        en: ":is() groups selectors, while :where() provides similar grouping with zero specificity."
      }
    },

    example: `
/* Të gjithë paragrafët brenda një artikulli */
article p {
  color: #374151;
}

/* Vetëm fëmijët e drejtpërdrejtë */
.menu > li {
  list-style: none;
}

/* Paragrafi menjëherë pas titullit */
h2 + p {
  margin-top: 0;
}

/* Të gjithë paragrafët pas një titulli */
h2 ~ p {
  color: #4b5563;
}

/* Përjashton elementet me klasën disabled */
button:not(.disabled) {
  cursor: pointer;
}

/* Grupim selektorësh */
:is(h1, h2, h3) {
  font-family: Arial, sans-serif;
}
`
  },

  // ==========================================
  // 5. CASCADE, SPECIFICITY & INHERITANCE
  // ==========================================
  cascadeAndSpecificity: {
    title: {
      sq: "Cascade, specifiteti dhe trashëgimia",
      en: "Cascade, Specificity, and Inheritance"
    },

    topics: {
      cascade: {
        sq: "Cascade zgjidh konfliktet ndërmjet deklarimeve duke marrë parasysh rëndësinë, origjinën, shtresat, specifitetin dhe renditjen.",
        en: "The cascade resolves conflicts between declarations by considering importance, origin, layers, specificity, and order."
      },

      specificity: {
        sq: "Specifiteti krahasohet sipas ID-ve, klasave, atributeve, pseudo-klasave, elementeve dhe pseudo-elementeve. Nuk është thjesht një rregull i vetëm fiks për çdo konflikt.",
        en: "Specificity is compared using IDs, classes, attributes, pseudo-classes, elements, and pseudo-elements. It is not the only factor in every conflict."
      },

      inheritance: {
        sq: "Disa veti, si color dhe font-family, zakonisht trashëgohen nga prindi. Shumë veti të modelit të kutisë nuk trashëgohen automatikisht.",
        en: "Some properties, such as color and font-family, are generally inherited from the parent. Many box-model properties are not inherited automatically."
      },

      inheritInitialUnset: {
        sq: "inherit merr vlerën e trashëguar nga prindi, initial vendos vlerën fillestare të përcaktuar nga CSS dhe unset sillet si inherit ose initial sipas vetisë.",
        en: "inherit takes the parent's inherited value, initial sets the CSS-defined initial value, and unset behaves as inherit or initial depending on the property."
      },

      important: {
        sq: "!important ndryshon përparësinë e deklarimit dhe mund ta bëjë mirëmbajtjen më të vështirë. Përdore vetëm kur ka arsye të fortë.",
        en: "!important changes declaration priority and can make maintenance harder. Use it only when there is a strong reason."
      }
    },

    example: `
/* Specifitet më i ulët */
p {
  color: #374151;
}

/* Selektori i klasës ka më shumë specifitet */
.notice {
  color: #b91c1c;
}

/* Deklarimi për elementin me këtë ID */
#page-notice {
  color: #1d4ed8;
}

/* Trashëgimia */
.parent {
  color: #166534;
}

.parent p {
  font-family: Arial, sans-serif;
}

/* Vlera eksplicite */
.inherit-color {
  color: inherit;
}
`
  },

  // ==========================================
  // 6. CSS BOX MODEL
  // ==========================================
  boxModel: {
    title: {
      sq: "Modeli i kutisë në CSS",
      en: "The CSS Box Model"
    },

    topics: {
      content: {
        sq: "Content është zona ku paraqitet teksti, imazhi ose përmbajtja tjetër e elementit.",
        en: "Content is the area where an element's text, image, or other content is displayed."
      },

      padding: {
        sq: "Padding është hapësira ndërmjet përmbajtjes dhe kornizës së elementit.",
        en: "Padding is the space between an element's content and its border."
      },

      border: {
        sq: "Border është korniza që rrethon përmbajtjen dhe padding-un.",
        en: "Border is the edge surrounding the content and padding."
      },

      margin: {
        sq: "Margin është hapësira jashtë kornizës së elementit. Margins vertikale të elementeve block mund të bashkohen në disa raste.",
        en: "Margin is the space outside an element's border. Vertical margins of block elements can collapse in some cases."
      },

      boxSizing: {
        sq: "Me box-sizing: border-box, gjerësia dhe lartësia e deklaruar përfshijnë padding-un dhe border-in.",
        en: "With box-sizing: border-box, declared width and height include padding and border."
      },

      dimensions: {
        sq: "width dhe height caktojnë dimensionet, ndërsa min-width, max-width, min-height dhe max-height vendosin kufij.",
        en: "width and height set dimensions, while min-width, max-width, min-height, and max-height establish limits."
      },

      overflow: {
        sq: "overflow kontrollon përmbajtjen që tejkalon dimensionet e kutisë, me vlera si visible, hidden, clip, auto dhe scroll.",
        en: "overflow controls content exceeding the box dimensions, using values such as visible, hidden, clip, auto, and scroll."
      }
    },

    example: `
*,
*::before,
*::after {
  box-sizing: border-box;
}

.card {
  width: 320px;
  max-width: 100%;
  padding: 1.25rem;
  border: 1px solid #d1d5db;
  margin: 1rem auto;
  border-radius: 0.75rem;
}

.card-content {
  min-width: 0;
  overflow-wrap: anywhere;
}
`
  },

  // ==========================================
  // 7. MARGIN, PADDING & SPACING
  // ==========================================
  spacing: {
    title: {
      sq: "Hapësirat, margin dhe padding",
      en: "Spacing, Margin, and Padding"
    },

    topics: {
      marginProperties: {
        sq: "margin-top, margin-right, margin-bottom dhe margin-left kontrollojnë hapësirat e jashtme individuale.",
        en: "margin-top, margin-right, margin-bottom, and margin-left control individual outer spacing."
      },

      paddingProperties: {
        sq: "padding-top, padding-right, padding-bottom dhe padding-left kontrollojnë hapësirat e brendshme.",
        en: "padding-top, padding-right, padding-bottom, and padding-left control inner spacing."
      },

      shorthand: {
        sq: "Shorthand për margin dhe padding mund të përdorë një deri në katër vlera për të caktuar anët përkatëse.",
        en: "Margin and padding shorthand can use one to four values to specify the corresponding sides."
      },

      autoMargins: {
        sq: "margin-inline: auto mund të centrojë një element block me gjerësi të kufizuar brenda prindit.",
        en: "margin-inline: auto can center a width-constrained block element within its parent."
      },

      gap: {
        sq: "gap vendos hapësirën ndërmjet elementeve në kontejnerët Flexbox dhe Grid.",
        en: "gap sets spacing between items in Flexbox and Grid containers."
      }
    },

    example: `
.container {
  max-width: 1100px;
  margin-inline: auto;
  padding: 1.5rem;
}

.card-list {
  display: grid;
  gap: 1rem;
}

.card {
  padding: 1rem 1.25rem;
  margin-block: 0.5rem;
}
`
  },

  // ==========================================
  // 8. TYPOGRAPHY
  // ==========================================
  typography: {
    title: {
      sq: "Tipografia dhe teksti",
      en: "Typography and Text"
    },

    topics: {
      fontFamily: {
        sq: "font-family përcakton familjen e shkronjave dhe duhet të përfshijë një familje rezervë të përshtatshme.",
        en: "font-family specifies the typeface family and should include an appropriate fallback family."
      },

      fontSize: {
        sq: "font-size përcakton madhësinë e tekstit. Njësitë rem dhe em ndihmojnë në krijimin e madhësive fleksibile.",
        en: "font-size determines text size. The rem and em units help create flexible sizing."
      },

      fontWeight: {
        sq: "font-weight kontrollon trashësinë e shkronjave, zakonisht me vlera si 400 dhe 700, kur fonti i mbështet.",
        en: "font-weight controls text thickness, commonly using values such as 400 and 700 when supported by the font."
      },

      lineHeight: {
        sq: "line-height kontrollon lartësinë e rreshtit dhe ndihmon në përmirësimin e lexueshmërisë.",
        en: "line-height controls line height and helps improve readability."
      },

      textAlign: {
        sq: "text-align kontrollon rreshtimin horizontal të tekstit, si left, right, center dhe justify.",
        en: "text-align controls horizontal text alignment, such as left, right, center, and justify."
      },

      textDecoration: {
        sq: "text-decoration kontrollon vijat dekorative të tekstit, përfshirë underline dhe line-through.",
        en: "text-decoration controls text decoration lines, including underline and line-through."
      },

      letterAndWordSpacing: {
        sq: "letter-spacing kontrollon hapësirën ndërmjet karaktereve, ndërsa word-spacing kontrollon hapësirën ndërmjet fjalëve.",
        en: "letter-spacing controls spacing between characters, while word-spacing controls spacing between words."
      },

      textTransform: {
        sq: "text-transform ndryshon paraqitjen e shkronjave, për shembull në uppercase ose lowercase, pa ndryshuar tekstin origjinal.",
        en: "text-transform changes the visual casing of text, such as uppercase or lowercase, without changing the original text."
      }
    },

    example: `
body {
  font-family: system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #1f2937;
}

h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.lead {
  max-width: 65ch;
  text-align: left;
}

.link {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
`
  },

  // ==========================================
  // 9. COLORS & COLOR FORMATS
  // ==========================================
  colors: {
    title: {
      sq: "Ngjyrat në CSS",
      en: "Colors in CSS"
    },

    topics: {
      namedColors: {
        sq: "CSS mbështet emra të njohur ngjyrash, si red, blue, black dhe transparent.",
        en: "CSS supports named colors such as red, blue, black, and transparent."
      },

      hexColors: {
        sq: "Notacioni HEX përdor formate si #f00, #ff0000 dhe #ff000080 për të përfaqësuar ngjyrat, përfshirë alfa në formatin e zgjeruar.",
        en: "HEX notation uses formats such as #f00, #ff0000, and #ff000080 to represent colors, including alpha in the extended format."
      },

      rgbColors: {
        sq: "rgb() dhe rgba() mundësojnë përcaktimin e ngjyrave përmes komponentëve të kuq, gjelbër dhe blu, me mbështetje për transparencë.",
        en: "rgb() and rgba() specify colors through red, green, and blue components, with support for transparency."
      },

      hslColors: {
        sq: "hsl() përshkruan ngjyrën me hue, saturation dhe lightness. Ky format mund të jetë më intuitiv për disa rregullime të ngjyrave.",
        en: "hsl() describes color using hue, saturation, and lightness. This format can be more intuitive for some color adjustments."
      },

      currentColor: {
        sq: "currentColor përdor vlerën aktuale të vetisë color të elementit për vetitë që pranojnë ngjyrë.",
        en: "currentColor uses the element's current color value for properties that accept a color."
      },

      opacity: {
        sq: "opacity kontrollon transparencën e të gjithë elementit, përfshirë përmbajtjen e tij. Për transparencën vetëm të sfondit, përdor një ngjyrë me kanal alfa.",
        en: "opacity controls the transparency of the entire element, including its contents. For background-only transparency, use a color with an alpha channel."
      }
    },

    example: `
:root {
  --color-primary: #2563eb;
  --color-text: rgb(31 41 55);
  --color-surface: hsl(210 40% 98%);
  --color-border: #d1d5db;
}

.card {
  color: var(--color-text);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
}

.card a {
  color: var(--color-primary);
}

.card a:hover {
  color: currentColor;
}
`
  },

  // ==========================================
  // 10. BACKGROUNDS & GRADIENTS
  // ==========================================
  backgrounds: {
    title: {
      sq: "Sfondet dhe gradientët",
      en: "Backgrounds and Gradients"
    },

    topics: {
      backgroundColor: {
        sq: "background-color vendos ngjyrën e sfondit të elementit.",
        en: "background-color sets an element's background color."
      },

      backgroundImage: {
        sq: "background-image mund të përdorë imazhe ose funksione gradient për të krijuar sfond.",
        en: "background-image can use images or gradient functions to create backgrounds."
      },

      backgroundSize: {
        sq: "background-size kontrollon madhësinë e imazhit të sfondit, përfshirë cover dhe contain.",
        en: "background-size controls the size of a background image, including cover and contain."
      },

      backgroundPosition: {
        sq: "background-position përcakton pozicionin e imazhit të sfondit.",
        en: "background-position determines the position of the background image."
      },

      backgroundRepeat: {
        sq: "background-repeat përcakton nëse imazhi i sfondit përsëritet.",
        en: "background-repeat determines whether a background image repeats."
      },

      linearGradient: {
        sq: "linear-gradient() krijon kalim ngjyrash përgjatë një drejtimi.",
        en: "linear-gradient() creates a color transition along a direction."
      },

      radialGradient: {
        sq: "radial-gradient() krijon kalim ngjyrash që përhapet nga një pikë ose formë qendrore.",
        en: "radial-gradient() creates a color transition spreading from a central point or shape."
      }
    },

    example: `
.hero {
  color: white;
  background-color: #1e3a8a;
  background-image: linear-gradient(
    135deg,
    #1e3a8a,
    #2563eb
  );
  padding: 4rem 2rem;
}

.image-card {
  background-image: url("../images/cover.jpg");
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.highlight {
  background-image: radial-gradient(
    circle,
    #dbeafe,
    #eff6ff
  );
}
`
  },

  // ==========================================
  // 11. DISPLAY & VISIBILITY
  // ==========================================
  displayAndVisibility: {
    title: {
      sq: "Display dhe dukshmëria",
      en: "Display and Visibility"
    },

    topics: {
      block: {
        sq: "display: block zakonisht krijon kuti blloku që fillon në rresht të ri dhe zë gjerësinë e disponueshme.",
        en: "display: block generally creates a block box that starts on a new line and occupies the available width."
      },

      inline: {
        sq: "display: inline e vendos elementin brenda rrjedhës së tekstit. Gjerësia dhe lartësia zakonisht nuk sillen si te elementet block.",
        en: "display: inline places the element within text flow. Width and height generally do not behave as they do on block elements."
      },

      inlineBlock: {
        sq: "display: inline-block lejon që elementi të qëndrojë në rresht ndërsa pranon gjerësi dhe lartësi.",
        en: "display: inline-block allows an element to remain inline while accepting width and height."
      },

      none: {
        sq: "display: none heq elementin nga paraqitja dhe nga hapësira e tij në layout.",
        en: "display: none removes the element from rendering and its layout space."
      },

      visibility: {
        sq: "visibility: hidden fsheh elementin, por zakonisht ruan hapësirën që ai zë.",
        en: "visibility: hidden hides the element while generally preserving the space it occupies."
      },

      opacity: {
        sq: "opacity: 0 e bën elementin plotësisht transparent, por nuk e heq automatikisht nga layout-i ose nga navigimi me tastierë.",
        en: "opacity: 0 makes an element fully transparent but does not automatically remove it from layout or keyboard navigation."
      }
    },

    example: `
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
}

.hidden-layout {
  display: none;
}

.invisible-space {
  visibility: hidden;
}

.transparent {
  opacity: 0;
}
`
  },

  // ==========================================
  // 12. CSS UNITS & SIZING
  // ==========================================
  unitsAndSizing: {
    title: {
      sq: "Njësitë dhe madhësitë në CSS",
      en: "CSS Units and Sizing"
    },

    topics: {
      pixels: {
        sq: "px është njësi absolute CSS e përdorur gjerësisht për madhësi të sakta, megjithëse madhësia fizike e saj varet nga mjedisi i paraqitjes.",
        en: "px is an absolute CSS unit widely used for precise sizing, although its physical size depends on the rendering environment."
      },

      em: {
        sq: "em lidhet me madhësinë e shkronjave të kontekstit përkatës. Kuptimi i saktë varet nga vetia ku përdoret.",
        en: "em relates to the font size of the relevant context. Its exact reference depends on the property where it is used."
      },

      rem: {
        sq: "rem lidhet me madhësinë e shkronjave të elementit rrënjë dhe është i dobishëm për madhësi të qëndrueshme në gjithë faqen.",
        en: "rem relates to the root element's font size and is useful for consistent sizing throughout a page."
      },

      percentages: {
        sq: "Përqindjet llogariten në raport me një vlerë referuese që varet nga vetia CSS.",
        en: "Percentages are calculated relative to a reference value that depends on the CSS property."
      },

      viewportUnits: {
        sq: "vw dhe vh lidhen me dimensionet e viewport-it. Njësitë moderne svh, lvh dhe dvh ndihmojnë për lartësinë e viewport-it në pajisjet mobile.",
        en: "vw and vh relate to viewport dimensions. Modern svh, lvh, and dvh units help handle viewport height on mobile devices."
      },

      minMaxClamp: {
        sq: "min(), max() dhe clamp() mundësojnë madhësi të llogaritura dhe fleksibile. clamp() kufizon vlerën midis një minimumi dhe maksimumi.",
        en: "min(), max(), and clamp() enable calculated and flexible sizing. clamp() constrains a value between a minimum and maximum."
      },

      intrinsicSizing: {
        sq: "min-content, max-content dhe fit-content ndihmojnë në përcaktimin e dimensioneve sipas përmbajtjes.",
        en: "min-content, max-content, and fit-content help size elements according to their content."
      }
    },

    example: `
.page {
  width: min(100% - 2rem, 1200px);
  margin-inline: auto;
}

h1 {
  font-size: clamp(2rem, 4vw, 3.5rem);
}

.section {
  padding-block: 3rem;
  min-height: 50svh;
}

.content {
  max-width: 65ch;
}
`
  },

  // ==========================================
  // 13. BORDERS, OUTLINES & SHADOWS
  // ==========================================
  bordersAndShadows: {
    title: {
      sq: "Kornizat, konturet dhe hijet",
      en: "Borders, Outlines, and Shadows"
    },

    topics: {
      borderProperties: {
        sq: "border-width, border-style dhe border-color kontrollojnë trashësinë, stilin dhe ngjyrën e kornizës.",
        en: "border-width, border-style, and border-color control border thickness, style, and color."
      },

      borderRadius: {
        sq: "border-radius rrumbullakon cepat e elementit.",
        en: "border-radius rounds an element's corners."
      },

      outline: {
        sq: "outline krijon një kontur që nuk zë hapësirë në modelin e kutisë dhe përdoret shpesh për treguesin e fokusit.",
        en: "outline creates a contour that does not occupy space in the box model and is often used for focus indicators."
      },

      boxShadow: {
        sq: "box-shadow shton hije rreth kutisë. Hijet mund të jenë të jashtme ose të brendshme me inset.",
        en: "box-shadow adds shadows around a box. Shadows can be outer or inset."
      },

      focusVisible: {
        sq: ":focus-visible mundëson stilimin e fokusit që shfaqet në situata ku shfletuesi e konsideron të nevojshëm treguesin e fokusit.",
        en: ":focus-visible styles focus in situations where the browser determines that a focus indicator should be shown."
      }
    },

    example: `
.card {
  border: 1px solid #d1d5db;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
}

button {
  border: 0;
  border-radius: 0.5rem;
}

button:focus-visible,
a:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 3px;
}
`
  },

  // ==========================================
  // 14. CSS VARIABLES / CUSTOM PROPERTIES
  // ==========================================
  cssVariables: {
    title: {
      sq: "Variablat dhe vetitë e personalizuara CSS",
      en: "CSS Variables and Custom Properties"
    },

    topics: {
      declaration: {
        sq: "Vetitë e personalizuara deklarohen me prefiksin --, zakonisht në :root kur duhen përdorur në shumë pjesë të faqes.",
        en: "Custom properties are declared with the -- prefix, often in :root when they are needed across many parts of a page."
      },

      varFunction: {
        sq: "Funksioni var() lexon vlerën e një vetie të personalizuar dhe mund të ketë vlerë rezervë.",
        en: "The var() function reads a custom property's value and can include a fallback."
      },

      inheritance: {
        sq: "Vetitë e personalizuara zakonisht trashëgohen, prandaj mund të mbishkruhen në një element prind për të ndryshuar temën e një zone.",
        en: "Custom properties generally inherit, so they can be overridden on a parent element to change a region's theme."
      },

      theming: {
        sq: "Variablat CSS mundësojnë menaxhim të përbashkët të ngjyrave, hapësirave, kufijve dhe vlerave të tjera të dizajnit.",
        en: "CSS variables enable shared management of colors, spacing, borders, and other design values."
      }
    },

    example: `
:root {
  --color-primary: #2563eb;
  --color-text: #111827;
  --color-surface: #ffffff;
  --spacing-unit: 1rem;
  --border-radius: 0.75rem;
}

.button {
  color: white;
  background-color: var(--color-primary);
  padding: var(--spacing-unit);
  border-radius: var(--border-radius);
}

.panel {
  color: var(--color-text);
  background-color: var(--color-surface);
}

.panel-dark {
  --color-text: #f9fafb;
  --color-surface: #111827;
}
`
  },

  // ==========================================
  // 15. CSS GLOSSARY
  // ==========================================
  glossary: [
    {
      term: "CSS",
      sq: "Gjuhë stili që kontrollon paraqitjen vizuale të dokumenteve web.",
      en: "A styling language that controls the visual presentation of web documents."
    },
    {
      term: "Selector",
      sq: "Shprehje që përcakton elementet HTML ku zbatohen rregullat CSS.",
      en: "An expression that identifies the HTML elements to which CSS rules apply."
    },
    {
      term: "Declaration",
      sq: "Kombinimi i një vetie CSS me vlerën e saj.",
      en: "A combination of a CSS property and its value."
    },
    {
      term: "Cascade",
      sq: "Mekanizmi që zgjidh konfliktet ndërmjet deklarimeve CSS.",
      en: "The mechanism that resolves conflicts between CSS declarations."
    },
    {
      term: "Specificity",
      sq: "Pesha e një selektori që përdoret gjatë zgjidhjes së konflikteve të CSS-së.",
      en: "The weight of a selector used when resolving CSS conflicts."
    },
    {
      term: "Inheritance",
      sq: "Mekanizëm përmes të cilit disa veti kalojnë nga elementi prind te fëmijët.",
      en: "A mechanism through which some properties pass from parent elements to children."
    },
    {
      term: "Box Model",
      sq: "Modeli që përshkruan content, padding, border dhe margin të një elementi.",
      en: "The model describing an element's content, padding, border, and margin."
    },
    {
      term: "Pseudo-class",
      sq: "Selektor që synon një gjendje ose karakteristikë të elementit, si :hover ose :focus.",
      en: "A selector targeting an element state or characteristic, such as :hover or :focus."
    },
    {
      term: "Custom Property",
      sq: "Veti e personalizuar CSS, zakonisht e deklaruar me prefiksin --.",
      en: "A custom CSS property, usually declared with the -- prefix."
    },
    {
      term: "Responsive Design",
      sq: "Qasje dizajni që e përshtat paraqitjen me madhësi dhe kushte të ndryshme ekrani.",
      en: "A design approach that adapts presentation to different screen sizes and conditions."
    }
  ]
};

// CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = cssFundamentalsKnowledge;
}
