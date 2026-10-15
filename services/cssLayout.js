export const cssLayoutKnowledge = {
  title: "CSS Layout & Responsive Design Master Knowledge Base",
  description: {
    sq: "Njohuri të strukturuara për layout-et CSS, Flexbox, Grid, pozicionimin, dizajnin responsive dhe përshtatjen e faqeve në pajisje të ndryshme.",
    en: "Structured knowledge of CSS layouts, Flexbox, Grid, positioning, responsive design, and adapting pages to different devices."
  },

  sections: [

    // =====================================================
    // 1. CSS LAYOUT FUNDAMENTALS
    // =====================================================
    {
      id: "layout-fundamentals",
      title: {
        sq: "Bazat e CSS Layout",
        en: "CSS Layout Fundamentals"
      },
      content: {
        sq: "CSS Layout përcakton mënyrën se si elementet HTML organizohen, pozicionohen dhe shpërndahen në faqe. Modeli bazë përfshin normal flow, block layout, inline layout, Flexbox, Grid dhe positioning.",
        en: "CSS Layout determines how HTML elements are organized, positioned, and distributed on a page. Core layout models include normal flow, block layout, inline layout, Flexbox, Grid, and positioning."
      },
      concepts: [
        {
          name: "Normal Flow",
          sq: "Sjellja standarde e elementeve në dokument, ku elementet block zakonisht vendosen njëri pas tjetrit vertikalisht.",
          en: "The default document flow, where block elements generally appear one after another vertically."
        },
        {
          name: "Block Layout",
          sq: "Elementet block zakonisht fillojnë në rresht të ri dhe mund të zënë gjerësinë e disponueshme.",
          en: "Block elements generally start on a new line and can occupy the available width."
        },
        {
          name: "Inline Layout",
          sq: "Elementet inline vendosen brenda rrjedhës së tekstit dhe zakonisht nuk pranojnë width dhe height në të njëjtën mënyrë si elementet block.",
          en: "Inline elements participate in text flow and generally do not accept width and height in the same way as block elements."
        },
        {
          name: "Flexbox",
          sq: "Model layout-i njëdimensional për organizimin e elementeve në rresht ose kolonë.",
          en: "A one-dimensional layout model for arranging items in a row or column."
        },
        {
          name: "Grid",
          sq: "Model layout-i dydimensional për organizimin e elementeve në rreshta dhe kolona.",
          en: "A two-dimensional layout model for arranging items in rows and columns."
        }
      ],
      example: `
<div class="layout">
  <header>Header</header>
  <main>Main content</main>
  <aside>Sidebar</aside>
  <footer>Footer</footer>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;
  }

  header,
  footer {
    grid-column: 1 / -1;
  }
</style>
`
    },

    // =====================================================
    // 2. POSITION PROPERTY
    // =====================================================
    {
      id: "position-property",
      title: {
        sq: "Pozicionimi me CSS",
        en: "CSS Position Property"
      },
      content: {
        sq: "Prona position kontrollon mënyrën se si një element pozicionohet në dokument. Vlerat kryesore janë static, relative, absolute, fixed dhe sticky.",
        en: "The position property controls how an element is positioned in the document. Its main values are static, relative, absolute, fixed, and sticky."
      },
      values: [
        {
          name: "static",
          sq: "Pozicionimi standard. Top, right, bottom dhe left zakonisht nuk ndikojnë.",
          en: "The default positioning. Top, right, bottom, and left generally have no effect."
        },
        {
          name: "relative",
          sq: "Elementi mbetet në rrjedhën normale, por mund të zhvendoset nga pozicioni fillestar.",
          en: "The element remains in normal flow but can be offset from its original position."
        },
        {
          name: "absolute",
          sq: "Elementi hiqet nga rrjedha normale dhe pozicionohet kundrejt bllokut të tij referues, shpesh një paraardhës të pozicionuar.",
          en: "The element is removed from normal flow and positioned relative to its containing block, often a positioned ancestor."
        },
        {
          name: "fixed",
          sq: "Elementi zakonisht pozicionohet kundrejt viewport-it dhe qëndron në të njëjtin vend gjatë scroll-it.",
          en: "The element is generally positioned relative to the viewport and stays in place while scrolling."
        },
        {
          name: "sticky",
          sq: "Elementi sillet si element normal derisa të arrijë kufirin e përcaktuar, pastaj mund të qëndrojë i ngjitur gjatë scroll-it.",
          en: "The element behaves normally until it reaches a defined threshold, then can stick during scrolling."
        }
      ],
      example: `
.card {
  position: relative;
}

.card__badge {
  position: absolute;
  top: 12px;
  right: 12px;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-to-top {
  position: fixed;
  right: 20px;
  bottom: 20px;
}
`
    },

    // =====================================================
    // 3. POSITIONING ANCHORS AND CONTAINING BLOCKS
    // =====================================================
    {
      id: "position-containing-block",
      title: {
        sq: "Containing Block dhe Elementet Absolute",
        en: "Containing Blocks and Absolute Positioning"
      },
      content: {
        sq: "Një element absolute pozicionohet kundrejt containing block. Një prind me position: relative përdoret shpesh për të krijuar një referencë të parashikueshme.",
        en: "An absolutely positioned element is positioned relative to its containing block. A parent with position: relative is often used to create a predictable reference."
      },
      example: `
.product {
  position: relative;
  min-height: 240px;
}

.product__image {
  width: 100%;
  height: 240px;
  object-fit: cover;
}

.product__label {
  position: absolute;
  left: 12px;
  top: 12px;
  padding: 6px 10px;
  background: #111827;
  color: white;
  border-radius: 6px;
}
`,
      bestPractices: [
        {
          sq: "Përdor position: relative te prindi kur elementet absolute duhet të pozicionohen brenda tij.",
          en: "Use position: relative on the parent when absolute children should be positioned inside it."
        },
        {
          sq: "Mos përdor pozicionim absolute për të ndërtuar të gjithë layout-in e faqes.",
          en: "Do not use absolute positioning to build the entire page layout."
        },
        {
          sq: "Kontrollo përmbajtjen në madhësi të ndryshme ekrani që elementet të mos mbivendosen gabimisht.",
          en: "Test different screen sizes to ensure positioned elements do not overlap incorrectly."
        }
      ]
    },

    // =====================================================
    // 4. Z-INDEX AND STACKING CONTEXT
    // =====================================================
    {
      id: "z-index-stacking",
      title: {
        sq: "Z-Index dhe Stacking Context",
        en: "Z-Index and Stacking Context"
      },
      content: {
        sq: "z-index ndihmon në përcaktimin se cili element shfaqet përpara elementeve të tjera. Ai funksionon në kontekste të caktuara të pozicionimit dhe layout-it. Një stacking context i ri mund të krijohet nga prona të ndryshme CSS, prandaj një z-index shumë i lartë nuk e vendos domosdoshmërisht elementin mbi çdo element tjetër.",
        en: "z-index helps determine which element appears in front of other elements. It works within particular positioning and layout contexts. Various CSS properties can create a new stacking context, so a very high z-index does not necessarily place an element above every other element."
      },
      example: `
.page {
  position: relative;
  isolation: isolate;
}

.dropdown {
  position: absolute;
  z-index: 20;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.modal {
  position: fixed;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
}
`,
      concepts: [
        {
          name: "Stacking Context",
          sq: "Një kontekst i veçantë vizatimi ku z-index i elementeve krahasohet brenda atij konteksti.",
          en: "A separate painting context in which elements' z-index values are compared within that context."
        },
        {
          name: "isolation: isolate",
          sq: "Krijon një stacking context të ri pa pasur nevojë të ndryshosh position.",
          en: "Creates a new stacking context without requiring a change to position."
        },
        {
          name: "Common causes",
          sq: "Disa shkaqe të zakonshme janë transform, opacity më e vogël se 1, isolation: isolate dhe elementet e pozicionuara me z-index.",
          en: "Common causes include transform, opacity below 1, isolation: isolate, and positioned elements with z-index."
        }
      ],
      troubleshooting: [
        {
          problem: "z-index nuk funksionon siç pritet",
          solution_sq: "Kontrollo stacking context-et e prindërve, position, transform dhe opacity.",
          solution_en: "Check ancestor stacking contexts, position, transform, and opacity."
        }
      ]
    },

    // =====================================================
    // 5. FLEXBOX FUNDAMENTALS
    // =====================================================
    {
      id: "flexbox-fundamentals",
      title: {
        sq: "Bazat e Flexbox",
        en: "Flexbox Fundamentals"
      },
      content: {
        sq: "Flexbox është një model layout-i njëdimensional. Përdoret për të rreshtuar elementet, për të shpërndarë hapësirën dhe për të kontrolluar drejtimin dhe madhësinë e tyre.",
        en: "Flexbox is a one-dimensional layout model. It is used to align items, distribute space, and control their direction and sizing."
      },
      example: `
.flex-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
`,
      properties: [
        {
          name: "display",
          values: ["flex", "inline-flex"],
          sq: "Aktivizon layout-in Flexbox.",
          en: "Activates Flexbox layout."
        },
        {
          name: "flex-direction",
          values: ["row", "row-reverse", "column", "column-reverse"],
          sq: "Përcakton drejtimin e boshtit kryesor.",
          en: "Defines the direction of the main axis."
        },
        {
          name: "flex-wrap",
          values: ["nowrap", "wrap", "wrap-reverse"],
          sq: "Kontrollon nëse elementet mund të kalojnë në rreshta të rinj.",
          en: "Controls whether items can wrap onto additional lines."
        },
        {
          name: "gap",
          values: ["8px", "1rem", "24px"],
          sq: "Përcakton hapësirën midis elementeve flex.",
          en: "Sets the spacing between flex items."
        }
      ]
    },

    // =====================================================
    // 6. FLEXBOX ALIGNMENT
    // =====================================================
    {
      id: "flexbox-alignment",
      title: {
        sq: "Rreshtimi me Flexbox",
        en: "Flexbox Alignment"
      },
      content: {
        sq: "Flexbox përdor justify-content për shpërndarjen përgjatë boshtit kryesor dhe align-items për rreshtimin përgjatë boshtit tërthor. Drejtimi i boshtit kryesor ndryshon me flex-direction.",
        en: "Flexbox uses justify-content to distribute items along the main axis and align-items to align them along the cross axis. The main axis changes with flex-direction."
      },
      properties: [
        {
          name: "justify-content",
          values: [
            "flex-start",
            "flex-end",
            "center",
            "space-between",
            "space-around",
            "space-evenly"
          ],
          sq: "Shpërndan elementet përgjatë boshtit kryesor.",
          en: "Distributes items along the main axis."
        },
        {
          name: "align-items",
          values: [
            "stretch",
            "flex-start",
            "flex-end",
            "center",
            "baseline"
          ],
          sq: "Rreshton elementet përgjatë boshtit tërthor.",
          en: "Aligns items along the cross axis."
        },
        {
          name: "align-self",
          values: ["auto", "stretch", "center", "flex-start", "flex-end"],
          sq: "Lejon një element të ketë rreshtim të ndryshëm nga elementet e tjera.",
          en: "Allows one item to use a different alignment from other items."
        },
        {
          name: "align-content",
          values: ["stretch", "center", "space-between", "space-around"],
          sq: "Kontrollon shpërndarjen e rreshtave kur ka disa rreshta flex dhe hapësirë të lirë në boshtin tërthor.",
          en: "Controls the distribution of multiple flex lines when there is free space on the cross axis."
        }
      ],
      example: `
.hero {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  text-align: center;
}
`
    },

    // =====================================================
    // 7. FLEX ITEM SIZING
    // =====================================================
    {
      id: "flex-item-sizing",
      title: {
        sq: "Madhësia e Elementeve Flex",
        en: "Flex Item Sizing"
      },
      content: {
        sq: "Prona flex kontrollon se si një element rritet, zvogëlohet dhe përcakton madhësinë bazë brenda një kontejneri Flexbox.",
        en: "The flex property controls how an item grows, shrinks, and establishes its base size inside a Flexbox container."
      },
      properties: [
        {
          name: "flex-grow",
          sq: "Përcakton pjesën relative të hapësirës së lirë që mund të marrë elementi.",
          en: "Defines the relative share of available free space an item can receive."
        },
        {
          name: "flex-shrink",
          sq: "Përcakton se sa mund të zvogëlohet elementi kur hapësira nuk mjafton.",
          en: "Defines how much an item can shrink when space is insufficient."
        },
        {
          name: "flex-basis",
          sq: "Përcakton madhësinë fillestare të elementit përpara shpërndarjes së hapësirës së lirë.",
          en: "Defines the initial size of an item before free space is distributed."
        }
      ],
      example: `
.flex-layout {
  display: flex;
  gap: 16px;
}

.main-content {
  flex: 2 1 400px;
  min-width: 0;
}

.sidebar {
  flex: 1 1 220px;
}
`,
      tips: [
        {
          sq: "flex: 1 është një shkurtore e zakonshme për elemente që duhet të ndajnë hapësirën.",
          en: "flex: 1 is a common shorthand for items that should share available space."
        },
        {
          sq: "min-width: 0 mund të lejojë që një element flex të tkurret përtej madhësisë së tij minimale automatike dhe të shmangë overflow.",
          en: "min-width: 0 can allow a flex item to shrink below its automatic minimum size and help prevent overflow."
        }
      ]
    },

    // =====================================================
    // 8. CSS GRID FUNDAMENTALS
    // =====================================================
    {
      id: "grid-fundamentals",
      title: {
        sq: "Bazat e CSS Grid",
        en: "CSS Grid Fundamentals"
      },
      content: {
        sq: "CSS Grid është model layout-i dydimensional. Ai lejon kontroll të qartë mbi rreshtat, kolonat dhe hapësirat midis tyre.",
        en: "CSS Grid is a two-dimensional layout model. It provides explicit control over rows, columns, and the spaces between them."
      },
      example: `
.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
}
`,
      properties: [
        {
          name: "grid-template-columns",
          sq: "Përcakton strukturën e kolonave.",
          en: "Defines the column structure."
        },
        {
          name: "grid-template-rows",
          sq: "Përcakton strukturën e rreshtave.",
          en: "Defines the row structure."
        },
        {
          name: "gap",
          sq: "Përcakton hapësirat midis rreshtave dhe kolonave.",
          en: "Defines spacing between rows and columns."
        },
        {
          name: "fr unit",
          sq: "Njësi që përfaqëson një pjesë të hapësirës së lirë të Grid.",
          en: "A unit representing a share of the available Grid space."
        }
      ]
    },

    // =====================================================
    // 9. GRID ADVANCED TRACKS
    // =====================================================
    {
      id: "grid-advanced-tracks",
      title: {
        sq: "Kolonat Dinamike dhe Grid i Avancuar",
        en: "Dynamic Columns and Advanced Grid"
      },
      content: {
        sq: "Grid mund të krijojë kolona dinamike duke përdorur repeat(), minmax(), auto-fit dhe auto-fill. Këto funksione ndihmojnë në krijimin e layout-eve që përshtaten me gjerësinë e kontejnerit.",
        en: "Grid can create dynamic columns using repeat(), minmax(), auto-fit, and auto-fill. These functions help create layouts that adapt to the container width."
      },
      example: `
.product-grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 24px;
}
`,
      concepts: [
        {
          name: "repeat()",
          sq: "Përsërit një model të kolonave ose rreshtave.",
          en: "Repeats a pattern of columns or rows."
        },
        {
          name: "minmax()",
          sq: "Përcakton kufirin minimal dhe maksimal të një track-u.",
          en: "Defines the minimum and maximum size of a grid track."
        },
        {
          name: "auto-fit",
          sq: "Lejon që track-et bosh të mos ruajnë hapësirë të panevojshme, duke mundësuar zgjerimin e track-eve të mbetura.",
          en: "Allows empty tracks to collapse so remaining tracks can expand."
        },
        {
          name: "auto-fill",
          sq: "Mund të ruajë gjurmët e mundshme edhe kur nuk ka mjaft elemente për t'i mbushur.",
          en: "Can preserve available tracks even when there are not enough items to fill them."
        }
      ]
    },

    // =====================================================
    // 10. GRID ITEM PLACEMENT
    // =====================================================
    {
      id: "grid-item-placement",
      title: {
        sq: "Pozicionimi i Elementeve në Grid",
        en: "Grid Item Placement"
      },
      content: {
        sq: "Elementet e Grid mund të vendosen duke përcaktuar linjat fillestare dhe përfundimtare të rreshtave ose kolonave.",
        en: "Grid items can be positioned by defining their starting and ending row or column lines."
      },
      example: `
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  gap: 16px;
}

.dashboard__sidebar {
  grid-area: sidebar;
}

.dashboard__header {
  grid-area: header;
}

.dashboard__main {
  grid-area: main;
}

@media (max-width: 700px) {
  .dashboard {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "sidebar";
  }
}
`,
      properties: [
        {
          name: "grid-column",
          sq: "Përcakton shtrirjen e elementit në kolonat e Grid.",
          en: "Defines an item's span across Grid columns."
        },
        {
          name: "grid-row",
          sq: "Përcakton shtrirjen e elementit në rreshtat e Grid.",
          en: "Defines an item's span across Grid rows."
        },
        {
          name: "grid-area",
          sq: "Emërton ose cakton zonën e një elementi në Grid.",
          en: "Names or assigns an item's area in Grid."
        }
      ]
    },

    // =====================================================
    // 11. FLEXBOX VS GRID
    // =====================================================
    {
      id: "flexbox-vs-grid",
      title: {
        sq: "Kur të Përdoret Flexbox dhe Grid",
        en: "When to Use Flexbox and Grid"
      },
      content: {
        sq: "Flexbox është veçanërisht i përshtatshëm për rreshtimin e elementeve përgjatë një boshti. Grid është veçanërisht i përshtatshëm për layout-e me rreshta dhe kolona. Të dy modelet mund të përdoren së bashku.",
        en: "Flexbox is particularly suitable for aligning items along one axis. Grid is particularly suitable for layouts with rows and columns. Both models can be used together."
      },
      comparison: [
        {
          feature: "Dimension",
          flexbox: "One-dimensional",
          grid: "Two-dimensional"
        },
        {
          feature: "Common use",
          flexbox: "Navigation, toolbars, button groups",
          grid: "Dashboards, galleries, page layouts"
        },
        {
          feature: "Item sizing",
          flexbox: "Flexible distribution along an axis",
          grid: "Track-based row and column sizing"
        },
        {
          feature: "Best approach",
          flexbox: "Content-oriented alignment",
          grid: "Structured two-dimensional placement"
        }
      ],
      example: `
.page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
}

.page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
`
    },

    // =====================================================
    // 12. RESPONSIVE DESIGN FUNDAMENTALS
    // =====================================================
    {
      id: "responsive-design",
      title: {
        sq: "Bazat e Responsive Design",
        en: "Responsive Design Fundamentals"
      },
      content: {
        sq: "Responsive Design është qasja ku layout-i, teksti dhe përmbajtja përshtaten me madhësinë e ekranit dhe hapësirën e disponueshme. Një faqe responsive duhet të jetë e përdorshme në telefona, tableta dhe desktop.",
        en: "Responsive Design is an approach in which layout, text, and content adapt to screen size and available space. A responsive page should be usable on phones, tablets, and desktops."
      },
      principles: [
        {
          sq: "Përdor gjerësi fleksibile në vend të madhësive fikse kur është e përshtatshme.",
          en: "Use flexible widths instead of fixed sizes where appropriate."
        },
        {
          sq: "Përdor media queries kur layout-i ka nevojë të ndryshojë.",
          en: "Use media queries when the layout needs to change."
        },
        {
          sq: "Sigurohu që teksti të jetë i lexueshëm pa zoom të detyruar.",
          en: "Ensure text is readable without requiring forced zoom."
        },
        {
          sq: "Shmang scroll-in horizontal të panevojshëm.",
          en: "Avoid unnecessary horizontal scrolling."
        },
        {
          sq: "Testo me përmbajtje reale dhe me gjerësi të ndryshme viewport-i.",
          en: "Test with realistic content and different viewport widths."
        }
      ],
      example: `
* {
  box-sizing: border-box;
}

img,
video {
  max-width: 100%;
  height: auto;
}

.container {
  width: min(100% - 2rem, 1200px);
  margin-inline: auto;
}
`
    },

    // =====================================================
    // 13. VIEWPORT META TAG
    // =====================================================
    {
      id: "viewport-meta",
      title: {
        sq: "Viewport Meta Tag",
        en: "Viewport Meta Tag"
      },
      content: {
        sq: "Meta tag-u viewport ndihmon shfletuesit mobilë të përdorin gjerësinë reale të pajisjes për layout-in. Pa të, disa faqe mund të paraqiten sikur janë në një viewport desktop.",
        en: "The viewport meta tag helps mobile browsers use the device's actual width for layout. Without it, some pages may render as though they were displayed in a desktop-sized viewport."
      },
      example: `
<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
/>
`,
      bestPractices: [
        {
          sq: "Vendose meta tag-un viewport brenda elementit head të dokumentit HTML.",
          en: "Place the viewport meta tag inside the HTML document's head element."
        },
        {
          sq: "Mos e çaktivizo zoom-in e përdoruesit pa një arsye shumë të fortë aksesueshmërie dhe produkti.",
          en: "Do not disable user zoom without a compelling accessibility and product reason."
        }
      ]
    },

    // =====================================================
    // 14. MEDIA QUERIES
    // =====================================================
    {
      id: "media-queries",
      title: {
        sq: "Media Queries",
        en: "Media Queries"
      },
      content: {
        sq: "Media queries aplikojnë CSS vetëm kur plotësohen kushte të caktuara, si gjerësia e viewport-it, orientimi i ekranit ose preferencat e përdoruesit.",
        en: "Media queries apply CSS only when certain conditions are met, such as viewport width, screen orientation, or user preferences."
      },
      example: `
/* Base styles: mobile-first */
.navigation {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

/* Wider screens */
@media (min-width: 700px) {
  .navigation {
    flex-direction: row;
    align-items: center;
  }

  .content-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Large screens */
@media (min-width: 1100px) {
  .content-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
`,
      commonConditions: [
        {
          name: "min-width",
          sq: "Aplikon stilet kur viewport-i është të paktën aq i gjerë sa vlera e caktuar.",
          en: "Applies styles when the viewport is at least as wide as the specified value."
        },
        {
          name: "max-width",
          sq: "Aplikon stilet kur viewport-i nuk e tejkalon gjerësinë e caktuar.",
          en: "Applies styles when the viewport does not exceed the specified width."
        },
        {
          name: "orientation",
          sq: "Kontrollon nëse viewport-i është në orientim portrait ose landscape.",
          en: "Checks whether the viewport is in portrait or landscape orientation."
        },
        {
          name: "prefers-reduced-motion",
          sq: "Lejon përshtatjen e animacioneve sipas preferencës së përdoruesit për lëvizje të reduktuar.",
          en: "Allows animations to adapt to the user's reduced-motion preference."
        }
      ]
    },

    // =====================================================
    // 15. MOBILE-FIRST DESIGN
    // =====================================================
    {
      id: "mobile-first",
      title: {
        sq: "Qasja Mobile-First",
        en: "Mobile-First Design"
      },
      content: {
        sq: "Mobile-first do të thotë që fillimisht krijohen stilet për ekranet e vogla dhe më pas shtohen përmirësime për ekranet më të gjera. Kjo ndihmon në ruajtjen e një baze të thjeshtë dhe fleksibile.",
        en: "Mobile-first means creating styles for small screens first, then adding enhancements for wider screens. This helps maintain a simple and flexible foundation."
      },
      example: `
.article-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}

.article-sidebar {
  order: 2;
}

.article-content {
  order: 1;
}

@media (min-width: 900px) {
  .article-layout {
    grid-template-columns: minmax(0, 1fr) 300px;
  }

  .article-sidebar {
    order: 0;
  }
}
`,
      bestPractices: [
        {
          sq: "Shkruaj fillimisht CSS bazë pa media queries.",
          en: "Write the base CSS without media queries first."
        },
        {
          sq: "Shto breakpoint vetëm kur përmbajtja ose layout-i ka nevojë për ndryshim.",
          en: "Add a breakpoint only when the content or layout needs to change."
        },
        {
          sq: "Mos u mbështet vetëm te emrat e pajisjeve; përdor gjerësinë ku dizajni fillon të mos funksionojë mirë.",
          en: "Do not rely only on device names; use the width where the design begins to break down."
        }
      ]
    },

    // =====================================================
    // 16. RESPONSIVE BREAKPOINTS
    // =====================================================
    {
      id: "responsive-breakpoints",
      title: {
        sq: "Breakpoints Responsive",
        en: "Responsive Breakpoints"
      },
      content: {
        sq: "Breakpoint është një pikë ku media query ndryshon mënyrën e paraqitjes së layout-it. Nuk ka një grup vlerash që është i detyrueshëm për çdo projekt; breakpoint-et duhet të bazohen në përmbajtje.",
        en: "A breakpoint is a point at which a media query changes the layout's presentation. There is no mandatory set of values for every project; breakpoints should be based on the content."
      },
      example: `
/* Compact layout */
.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Medium layout */
@media (min-width: 640px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Wide layout */
@media (min-width: 1000px) {
  .cards {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
`,
      guidance: [
        {
          sq: "640px dhe 1000px janë vetëm shembuj, jo standard universal.",
          en: "640px and 1000px are examples, not universal standards."
        },
        {
          sq: "Testo edhe në gjerësi ndërmjet breakpoint-eve.",
          en: "Test at widths between breakpoints as well."
        },
        {
          sq: "Përdor një sistem të qëndrueshëm breakpoint-esh për të ruajtur mirëmbajtshmërinë.",
          en: "Use a consistent breakpoint system to maintain maintainability."
        }
      ]
    },

    // =====================================================
    // 17. FLUID SIZING WITH CLAMP
    // =====================================================
    {
      id: "fluid-sizing-clamp",
      title: {
        sq: "Madhësi Fleksibile me clamp(), min() dhe max()",
        en: "Fluid Sizing with clamp(), min(), and max()"
      },
      content: {
        sq: "Funksionet CSS clamp(), min() dhe max() lejojnë madhësi fleksibile me kufij të kontrolluar. Ato janë të dobishme për tipografi, hapësira dhe gjerësi kontejnerësh responsive.",
        en: "The CSS functions clamp(), min(), and max() allow flexible sizing with controlled limits. They are useful for responsive typography, spacing, and container widths."
      },
      example: `
.page-title {
  font-size: clamp(2rem, 5vw, 4.5rem);
  line-height: 1.1;
}

.section {
  padding-block: clamp(2rem, 6vw, 5rem);
}

.container {
  width: min(100% - 2rem, 1200px);
  margin-inline: auto;
}

.card {
  padding: max(1rem, 2vw);
}
`,
      concepts: [
        {
          name: "clamp(min, preferred, max)",
          sq: "Mban vlerën brenda kufirit minimal dhe maksimal, duke përdorur vlerën e preferuar kur është e mundur.",
          en: "Keeps a value within minimum and maximum bounds while using the preferred value when possible."
        },
        {
          name: "min()",
          sq: "Kthen vlerën më të vogël nga argumentet e dhëna.",
          en: "Returns the smallest of the supplied values."
        },
        {
          name: "max()",
          sq: "Kthen vlerën më të madhe nga argumentet e dhëna.",
          en: "Returns the largest of the supplied values."
        }
      ]
    },

    // =====================================================
    // 18. CONTAINER QUERIES
    // =====================================================
    {
      id: "container-queries",
      title: {
        sq: "Container Queries",
        en: "Container Queries"
      },
      content: {
        sq: "Container queries lejojnë që stilet e një komponenti të varen nga madhësia e kontejnerit të tij dhe jo vetëm nga viewport-i. Kjo është e dobishme për komponentë që përdoren në vende të ndryshme të faqes.",
        en: "Container queries allow a component's styles to depend on its container's size rather than only on the viewport. This is useful for components reused in different parts of a page."
      },
      example: `
.card-region {
  container-type: inline-size;
}

.card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@container (min-width: 520px) {
  .card {
    grid-template-columns: 160px minmax(0, 1fr);
    align-items: center;
  }
}
`,
      bestPractices: [
        {
          sq: "Vendos container-type në elementin që do të shërbejë si kontejner referues.",
          en: "Set container-type on the element that should act as the query container."
        },
        {
          sq: "Përdor container queries kur komponenti duhet të përshtatet me hapësirën e vet.",
          en: "Use container queries when a component should adapt to its own available space."
        },
        {
          sq: "Përdor media queries kur ndryshimi varet nga viewport-i ose preferencat e përgjithshme të pajisjes.",
          en: "Use media queries when changes depend on the viewport or general device preferences."
        }
      ]
    },

    // =====================================================
    // 19. OVERFLOW AND SCROLLING
    // =====================================================
    {
      id: "overflow-scrolling",
      title: {
        sq: "Overflow dhe Scroll",
        en: "Overflow and Scrolling"
      },
      content: {
        sq: "Prona overflow kontrollon se çfarë ndodh kur përmbajtja del jashtë hapësirës së elementit. Ajo mund të fshehë përmbajtjen, të krijojë scroll ose ta lejojë të shfaqet jashtë kufijve.",
        en: "The overflow property controls what happens when content extends beyond an element's box. It can clip content, create scrolling, or allow content to remain visible outside the bounds."
      },
      properties: [
        {
          name: "visible",
          sq: "Përmbajtja mund të shfaqet jashtë kutisë së elementit.",
          en: "Content may appear outside the element's box."
        },
        {
          name: "hidden",
          sq: "Përmbajtja që del jashtë kufijve pritet dhe nuk ofrohet scroll standard nga ajo vlerë.",
          en: "Overflowing content is clipped and standard scrolling is not provided by this value."
        },
        {
          name: "auto",
          sq: "Shfletuesi ofron scroll kur është i nevojshëm.",
          en: "The browser provides scrolling when needed."
        },
        {
          name: "scroll",
          sq: "Krijon mekanizëm scroll-i edhe kur përmbajtja nuk e kërkon gjithmonë.",
          en: "Provides a scrolling mechanism even when content may not always require it."
        },
        {
          name: "clip",
          sq: "Pret përmbajtjen jashtë kufijve pa krijuar një scroll container.",
          en: "Clips overflow without creating a scroll container."
        }
      ],
      example: `
.table-wrapper {
  max-width: 100%;
  overflow-x: auto;
}

.chat-panel {
  overflow-y: auto;
  overscroll-behavior: contain;
  max-height: 420px;
}

.page-shell {
  overflow-wrap: anywhere;
}
`,
      warning: {
        sq: "Kujdes: overflow: hidden te prindërit mund të presë dropdown-e, hije ose elemente sticky. Kontrollo edhe scroll container-in e elementeve sticky.",
        en: "Caution: overflow: hidden on ancestors can clip dropdowns, shadows, or sticky elements. Also check the scroll container used by sticky elements."
      }
    },

    // =====================================================
    // 20. STICKY HEADER AND SCROLL OFFSET
    // =====================================================
    {
      id: "sticky-header-scroll",
      title: {
        sq: "Header Sticky dhe Scroll Offset",
        en: "Sticky Headers and Scroll Offsets"
      },
      content: {
        sq: "Header-at sticky mund të qëndrojnë të dukshëm gjatë scroll-it. Kur navigohet drejt një seksioni me anchor, scroll-margin-top ndihmon që titulli të mos fshihet pas header-it.",
        en: "Sticky headers can remain visible while scrolling. When navigating to an anchored section, scroll-margin-top helps prevent the heading from being hidden behind the header."
      },
      example: `
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
}

section[id] {
  scroll-margin-top: 5rem;
}

html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
`,
      notes: [
        {
          sq: "Sticky kërkon një kufi si top: 0 që të aktivizohet në drejtimin vertikal.",
          en: "Sticky positioning needs a threshold such as top: 0 to activate vertically."
        },
        {
          sq: "Prindërit me overflow mund të ndikojnë se cili kontejner përdoret për scroll.",
          en: "Ancestors with overflow can affect which container is used for scrolling."
        },
        {
          sq: "Scroll behavior duhet të respektojë preferencën reduced-motion.",
          en: "Scroll behavior should respect the reduced-motion preference."
        }
      ]
    },

    // =====================================================
    // 21. ASPECT RATIO AND OBJECT FIT
    // =====================================================
    {
      id: "aspect-ratio-object-fit",
      title: {
        sq: "Aspect Ratio dhe Object Fit",
        en: "Aspect Ratio and Object Fit"
      },
      content: {
        sq: "aspect-ratio përcakton raportin e preferuar të gjerësisë me lartësinë. object-fit kontrollon se si imazhi ose video përshtatet brenda dimensioneve të elementit.",
        en: "aspect-ratio defines a preferred width-to-height ratio. object-fit controls how an image or video fits inside the element's dimensions."
      },
      example: `
.media-card__image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 12px;
}

.avatar {
  width: 64px;
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: cover;
}
`,
      properties: [
        {
          name: "aspect-ratio",
          sq: "Përcakton raportin e preferuar të dimensioneve të elementit.",
          en: "Defines the preferred ratio between an element's dimensions."
        },
        {
          name: "object-fit: cover",
          sq: "Mbush kutinë duke ruajtur raportin e imazhit, por mund të presë pjesë të tij.",
          en: "Fills the box while preserving the image ratio, potentially cropping parts of it."
        },
        {
          name: "object-fit: contain",
          sq: "Shfaq të gjithë imazhin brenda kutisë, duke ruajtur raportin e tij.",
          en: "Displays the entire image inside the box while preserving its ratio."
        },
        {
          name: "object-position",
          sq: "Kontrollon pikën e pozicionimit të përmbajtjes brenda kutisë.",
          en: "Controls the positioning of content inside the box."
        }
      ]
    },

    // =====================================================
    // 22. LOGICAL PROPERTIES
    // =====================================================
    {
      id: "css-logical-properties",
      title: {
        sq: "CSS Logical Properties",
        en: "CSS Logical Properties"
      },
      content: {
        sq: "Logical properties përcaktojnë hapësirat dhe dimensionet sipas drejtimit të shkrimit dhe rrjedhës së dokumentit, në vend që të përdorin gjithmonë left dhe right. Ato ndihmojnë në mbështetjen e gjuhëve me drejtime të ndryshme.",
        en: "Logical properties define spacing and dimensions according to writing direction and document flow instead of always using left and right. They help support languages with different writing directions."
      },
      example: `
.card {
  padding-block: 20px;
  padding-inline: 24px;
  margin-block: 16px;
  margin-inline: auto;
  border-inline-start: 4px solid #2563eb;
}

.icon {
  margin-inline-end: 8px;
}
`,
      mappings: [
        {
          logical: "margin-inline-start",
          physical: "margin-left in a typical left-to-right horizontal layout",
          sq: "Hapësira në fillim të drejtimit inline.",
          en: "Spacing at the start of the inline direction."
        },
        {
          logical: "padding-block",
          physical: "padding-top and padding-bottom in a typical horizontal layout",
          sq: "Hapësira e brendshme në drejtimin block.",
          en: "Inner spacing along the block direction."
        },
        {
          logical: "border-inline-end",
          physical: "border-right in a typical left-to-right horizontal layout",
          sq: "Kufiri në fund të drejtimit inline.",
          en: "The border at the end of the inline direction."
        }
      ]
    },

    // =====================================================
    // 23. RESPONSIVE TYPOGRAPHY
    // =====================================================
    {
      id: "responsive-typography",
      title: {
        sq: "Tipografi Responsive",
        en: "Responsive Typography"
      },
      content: {
        sq: "Tipografia responsive përshtat madhësinë e shkronjave, line-height dhe gjerësinë e rreshtave me hapësirën e disponueshme. Qëllimi është lexueshmëria, jo vetëm zvogëlimi i tekstit në ekranet e vogla.",
        en: "Responsive typography adapts font size, line-height, and line length to the available space. The goal is readability, not merely shrinking text on small screens."
      },
      example: `
.article-title {
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.1;
  max-width: 18ch;
}

.article-body {
  font-size: clamp(1rem, 0.4vw + 0.95rem, 1.125rem);
  line-height: 1.7;
  max-width: 70ch;
}
`,
      concepts: [
        {
          name: "ch unit",
          sq: "Njësi e lidhur me gjerësinë e karakterit zero të font-it aktual; shpesh përdoret për kontrollin e gjatësisë së rreshtit.",
          en: "A unit related to the width of the current font's zero character; often used to control line length."
        },
        {
          name: "line-height",
          sq: "Kontrollon lartësinë e rreshtit dhe hapësirën vertikale midis rreshtave.",
          en: "Controls line-box height and vertical spacing between lines."
        },
        {
          name: "max-width",
          sq: "Kufizon gjerësinë e paragrafëve për të ndihmuar leximin.",
          en: "Limits paragraph width to help readability."
        }
      ]
    },

    // =====================================================
    // 24. RESPONSIVE NAVIGATION
    // =====================================================
    {
      id: "responsive-navigation",
      title: {
        sq: "Navigimi Responsive",
        en: "Responsive Navigation"
      },
      content: {
        sq: "Navigimi responsive duhet të mbetet i qartë, i arritshëm dhe i përdorshëm në ekrane të vogla. CSS mund të ndryshojë paraqitjen, por hapja dhe mbyllja interaktive e menusë zakonisht kërkon HTML të përshtatshëm dhe shpesh JavaScript.",
        en: "Responsive navigation should remain clear, accessible, and usable on small screens. CSS can change the presentation, but interactive menu opening and closing generally requires suitable HTML and often JavaScript."
      },
      example: `
.site-nav {
  display: flex;
  align-items: center;
  gap: 20px;
}

.site-nav a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  text-decoration: none;
}

@media (max-width: 720px) {
  .site-nav {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }

  .site-nav a {
    padding: 8px 12px;
  }
}
`,
      accessibility: [
        {
          sq: "Siguro kontrast të mjaftueshëm dhe zona të përshtatshme klikimi.",
          en: "Provide sufficient contrast and appropriately sized interaction targets."
        },
        {
          sq: "Përdor elemente button për kontrollet që hapin ose mbyllin menunë.",
          en: "Use button elements for controls that open or close the menu."
        },
        {
          sq: "Siguro që navigimi të funksionojë me tastierë dhe që gjendja e menusë të komunikohet për teknologjitë ndihmëse.",
          en: "Ensure keyboard operation and communicate menu state to assistive technologies."
        }
      ]
    },

    // =====================================================
    // 25. RESPONSIVE TABLES AND WIDE CONTENT
    // =====================================================
    {
      id: "responsive-tables",
      title: {
        sq: "Tabelat dhe Përmbajtja e Gjerë",
        en: "Responsive Tables and Wide Content"
      },
      content: {
        sq: "Tabelat dhe përmbajtja e gjerë mund të shkaktojnë overflow në ekranet e vogla. Një zgjidhje e zakonshme është vendosja e tabelës në një kontejner me scroll horizontal, duke ruajtur strukturën e saj.",
        en: "Tables and wide content can cause overflow on small screens. A common solution is to place the table in a horizontally scrollable container while preserving its structure."
      },
      example: `
.table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.table-scroll table {
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
}

.table-scroll th,
.table-scroll td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: start;
}
`,
      bestPractices: [
        {
          sq: "Mos e shkatërro strukturën semantike të tabelës vetëm për ta përshtatur me ekranin.",
          en: "Do not destroy the semantic table structure just to fit a small screen."
        },
        {
          sq: "Siguro që përdoruesi të kuptojë se kontejneri mund të bëhet scroll horizontalisht.",
          en: "Make it clear that the container can scroll horizontally."
        },
        {
          sq: "Kontrollo nëse një paraqitje alternative është më e përshtatshme për të dhëna komplekse.",
          en: "Consider whether an alternative presentation is more suitable for complex data."
        }
      ]
    },

    // =====================================================
    // 26. RESPONSIVE SPACING AND CONTAINERS
    // =====================================================
    {
      id: "responsive-containers",
      title: {
        sq: "Kontejnerët dhe Hapësirat Responsive",
        en: "Responsive Containers and Spacing"
      },
      content: {
        sq: "Kontejnerët kufizojnë gjerësinë e përmbajtjes, ndërsa hapësirat responsive përshtaten me madhësinë e viewport-it. Kjo krijon ritëm vizual të qëndrueshëm dhe parandalon që teksti të shtrihet tepër në ekrane të mëdha.",
        en: "Containers limit content width, while responsive spacing adapts to viewport size. This creates a consistent visual rhythm and prevents text from stretching too far on large screens."
      },
      example: `
:root {
  --page-gutter: clamp(1rem, 4vw, 2.5rem);
  --content-max: 1200px;
}

.container {
  width: min(
    calc(100% - 2 * var(--page-gutter)),
    var(--content-max)
  );
  margin-inline: auto;
}

.section {
  padding-block: clamp(2.5rem, 7vw, 6rem);
}
`,
      notes: [
        {
          sq: "Përdor të njëjtin model kontejneri në faqet kryesore për konsistencë.",
          en: "Use the same container pattern across main pages for consistency."
        },
        {
          sq: "Përdor CSS custom properties për të menaxhuar sistemin e hapësirave.",
          en: "Use CSS custom properties to manage the spacing system."
        }
      ]
    },

    // =====================================================
    // 27. PRINT STYLES
    // =====================================================
    {
      id: "print-styles",
      title: {
        sq: "Stilet për Printim",
        en: "Print Styles"
      },
      content: {
        sq: "Print styles përdorin media query print për të përshtatur faqen kur printohet ose ruhet si PDF nga shfletuesi.",
        en: "Print styles use the print media query to adapt a page when it is printed or saved as a PDF through the browser."
      },
      example: `
@media print {
  .site-header,
  .site-footer,
  .navigation,
  .print-hidden {
    display: none !important;
  }

  body {
    color: #000;
    background: #fff;
    font-size: 12pt;
  }

  a {
    color: inherit;
    text-decoration: underline;
  }

  .article {
    width: 100%;
    max-width: none;
  }

  img,
  table,
  pre {
    break-inside: avoid;
  }
}
`,
      bestPractices: [
        {
          sq: "Hiq elementet interaktive që nuk kanë vlerë në printim.",
          en: "Hide interactive elements that have no value in print."
        },
        {
          sq: "Kontrollo ndarjen e faqeve dhe mos lejo prerjen e panevojshme të përmbajtjes së rëndësishme.",
          en: "Check page breaks and avoid unnecessary splitting of important content."
        },
        {
          sq: "Mos u mbështet vetëm te ngjyrat e sfondit për të komunikuar informacion.",
          en: "Do not rely only on background colors to communicate information."
        }
      ]
    },

    // =====================================================
    // 28. REDUCED MOTION
    // =====================================================
    {
      id: "reduced-motion",
      title: {
        sq: "Preferenca për Lëvizje të Reduktuar",
        en: "Reduced Motion Preferences"
      },
      content: {
        sq: "prefers-reduced-motion lejon që ndërfaqja të respektojë përdoruesit që preferojnë më pak animacione ose lëvizje. Kjo është një praktikë e rëndësishme e aksesueshmërisë.",
        en: "prefers-reduced-motion allows an interface to respect users who prefer fewer animations or less motion. This is an important accessibility practice."
      },
      example: `
.card {
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.card:hover {
  transform: translateY(-3px);
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
}
`,
      notes: [
        {
          sq: "Mos përdor animacione të forta ose lëvizje të panevojshme për informacion thelbësor.",
          en: "Do not use intense or unnecessary motion to convey essential information."
        },
        {
          sq: "Kontrollo që ndërfaqja të mbetet funksionale kur animacionet reduktohen.",
          en: "Ensure the interface remains functional when animations are reduced."
        }
      ]
    },

    // =====================================================
    // 29. LAYOUT DEBUGGING
    // =====================================================
    {
      id: "layout-debugging",
      title: {
        sq: "Debugging i Layout-it",
        en: "Layout Debugging"
      },
      content: {
        sq: "Debugging i layout-it përfshin gjetjen e shkakut të overflow, mbivendosjeve, hapësirave të papritura dhe elementeve që nuk rreshtohen siç duhet. DevTools i shfletuesit është mjeti kryesor për inspektimin e këtyre problemeve.",
        en: "Layout debugging involves finding the causes of overflow, overlap, unexpected spacing, and misaligned elements. Browser DevTools is the primary tool for inspecting these problems."
      },
      checklist: [
        {
          sq: "Kontrollo display, position, width, height dhe box-sizing.",
          en: "Check display, position, width, height, and box-sizing."
        },
        {
          sq: "Kontrollo margin, padding, gap dhe madhësitë minimale të elementeve.",
          en: "Check margin, padding, gap, and the minimum sizes of elements."
        },
        {
          sq: "Inspekto stacking context-et kur z-index nuk funksionon siç pritet.",
          en: "Inspect stacking contexts when z-index does not behave as expected."
        },
        {
          sq: "Kontrollo prindërit me overflow dhe ndikimin e tyre te sticky ose dropdown.",
          en: "Check ancestors with overflow and their effect on sticky elements or dropdowns."
        },
        {
          sq: "Testo me tekst të gjatë, imazhe të mëdha dhe përmbajtje që ndryshon.",
          en: "Test with long text, large images, and variable content."
        },
        {
          sq: "Testo tastierën dhe zoom-in, jo vetëm madhësitë e viewport-it.",
          en: "Test keyboard navigation and zoom, not only viewport dimensions."
        }
      ],
      debuggingExample: `
/* Temporary layout debugging */
.debug * {
  outline: 1px solid rgba(255, 0, 0, 0.25);
}

/* Common overflow prevention */
.flex-child,
.grid-child {
  min-width: 0;
}

img,
video,
canvas,
svg {
  max-width: 100%;
}
`
    },

    // =====================================================
    // 30. COMMON LAYOUT MISTAKES
    // =====================================================
    {
      id: "layout-mistakes",
      title: {
        sq: "Gabimet e Zakonshme në Layout",
        en: "Common Layout Mistakes"
      },
      mistakes: [
        {
          problem: "Using fixed widths everywhere",
          sq: "Gjerësitë fikse mund të shkaktojnë overflow në ekranet e vogla.",
          en: "Fixed widths can cause overflow on small screens.",
          solution: "Prefer max-width, minmax(), flexible units, and responsive constraints."
        },
        {
          problem: "Using absolute positioning for the whole page",
          sq: "Faqja bëhet e brishtë kur përmbajtja ndryshon.",
          en: "The page becomes fragile when content changes.",
          solution: "Use normal flow, Flexbox, or Grid for the primary layout."
        },
        {
          problem: "Using z-index without understanding stacking contexts",
          sq: "Elementi mund të mbetet pas një elementi tjetër pavarësisht numrit të madh.",
          en: "An element can remain behind another despite having a large value.",
          solution: "Inspect ancestor stacking contexts and establish intentional layers."
        },
        {
          problem: "Ignoring long content",
          sq: "Teksti i gjatë mund të zgjerojë kartat ose të shkaktojë overflow.",
          en: "Long text can stretch cards or cause overflow.",
          solution: "Test realistic content and use min-width: 0, overflow-wrap, or appropriate scrolling."
        },
        {
          problem: "Choosing breakpoints based only on device labels",
          sq: "Pajisjet kanë madhësi dhe orientime të ndryshme.",
          en: "Devices have different sizes and orientations.",
          solution: "Choose breakpoints based on where the content or layout needs to change."
        },
        {
          problem: "Forgetting accessibility preferences",
          sq: "Animacionet, zoom-i dhe navigimi mund të krijojnë pengesa për disa përdorues.",
          en: "Animation, zoom, and navigation can create barriers for some users.",
          solution: "Respect reduced motion, keyboard use, zoom, and readable contrast."
        }
      ]
    },

    // =====================================================
    // 31. LAYOUT GLOSSARY
    // =====================================================
    {
      id: "layout-glossary",
      title: {
        sq: "Fjalor i CSS Layout",
        en: "CSS Layout Glossary"
      },
      terms: [
        {
          term: "Viewport",
          sq: "Zona e dukshme e faqes brenda dritares së shfletuesit.",
          en: "The visible page area inside the browser window."
        },
        {
          term: "Breakpoint",
          sq: "Pika ku media query ndryshon rregullat e paraqitjes.",
          en: "A point at which a media query changes presentation rules."
        },
        {
          term: "Flex Container",
          sq: "Elementi prind me display: flex ose inline-flex.",
          en: "A parent element with display: flex or inline-flex."
        },
        {
          term: "Flex Item",
          sq: "Fëmija i drejtpërdrejtë i një Flex Container.",
          en: "A direct child of a Flex Container."
        },
        {
          term: "Grid Container",
          sq: "Elementi prind me display: grid ose inline-grid.",
          en: "A parent element with display: grid or inline-grid."
        },
        {
          term: "Grid Track",
          sq: "Një rresht ose kolonë në strukturën Grid.",
          en: "A row or column in the Grid structure."
        },
        {
          term: "Gap",
          sq: "Hapësira midis elementeve ose track-eve të layout-it.",
          en: "Spacing between layout items or tracks."
        },
        {
          term: "Containing Block",
          sq: "Zona referuese që përdoret për pozicionimin dhe llogaritjen e madhësive të elementeve të caktuara.",
          en: "The reference area used for positioning and sizing certain elements."
        },
        {
          term: "Stacking Context",
          sq: "Kontekst i veçantë që përcakton renditjen vizuale të elementeve në shtresa.",
          en: "A separate context that determines the visual layering order of elements."
        },
        {
          term: "Overflow",
          sq: "Sjellja e përmbajtjes që del jashtë kutisë së elementit.",
          en: "The behavior of content that extends beyond an element's box."
        },
        {
          term: "Container Query",
          sq: "Rregull CSS që aplikon stile në bazë të kushteve të kontejnerit.",
          en: "A CSS rule that applies styles based on container conditions."
        },
        {
          term: "Mobile-First",
          sq: "Qasje që fillon me ekranet e vogla dhe zgjerohet drejt ekraneve më të mëdha.",
          en: "An approach that starts with small screens and scales up to larger screens."
        }
      ]
    }
  ]
};

// CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = cssLayoutKnowledge;
}
