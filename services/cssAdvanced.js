export const cssAdvancedStylingKnowledge = {
  title: "CSS Advanced Styling & Effects Master Knowledge Base",
  description: {
    sq: "Njohuri të avancuara për pseudo-classes, pseudo-elements, transitions, transforms, animations, gradients, filters, masks dhe efekte vizuale moderne në CSS.",
    en: "Advanced knowledge of pseudo-classes, pseudo-elements, transitions, transforms, animations, gradients, filters, masks, and modern CSS visual effects."
  },

  sections: [

    // =====================================================
    // 1. PSEUDO-CLASSES FUNDAMENTALS
    // =====================================================
    {
      id: "pseudo-classes",
      title: {
        sq: "Bazat e Pseudo-Classes",
        en: "Pseudo-Classes Fundamentals"
      },
      content: {
        sq: "Pseudo-classes zgjedhin elemente bazuar në gjendjen, pozicionin ose marrëdhënien e tyre me elementet e tjera. Ato përdorin një pikëpyetje të dyfishtë? Jo: pseudo-classes përdorin dy pika, për shembull :hover dhe :focus.",
        en: "Pseudo-classes select elements based on their state, position, or relationship with other elements. They use a single colon, for example :hover and :focus."
      },
      concepts: [
        {
          name: ":hover",
          sq: "Aktivizohet kur treguesi qëndron mbi elementin.",
          en: "Matches when the pointer hovers over an element."
        },
        {
          name: ":focus",
          sq: "Përputhet kur elementi ka fokus.",
          en: "Matches when an element has focus."
        },
        {
          name: ":focus-visible",
          sq: "Shfaq zakonisht fokusin vizual kur shfletuesi përcakton se ai është i dobishëm, veçanërisht gjatë navigimit me tastierë.",
          en: "Generally shows a visible focus indicator when the browser determines it is useful, especially during keyboard navigation."
        },
        {
          name: ":active",
          sq: "Përputhet gjatë aktivizimit të elementit, si gjatë shtypjes së një butoni.",
          en: "Matches while an element is being activated, such as while pressing a button."
        },
        {
          name: ":disabled",
          sq: "Përputhet me elementet form që janë të çaktivizuara.",
          en: "Matches disabled form elements."
        },
        {
          name: ":checked",
          sq: "Përputhet me checkbox ose radio input të përzgjedhur.",
          en: "Matches checked checkbox or radio inputs."
        }
      ],
      example: `
.button {
  background: #2563eb;
  color: white;
  transition: background-color 180ms ease;
}

.button:hover {
  background: #1d4ed8;
}

.button:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 3px;
}

.button:active {
  transform: scale(0.98);
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`
    },

    // =====================================================
    // 2. STRUCTURAL PSEUDO-CLASSES
    // =====================================================
    {
      id: "structural-pseudo-classes",
      title: {
        sq: "Pseudo-Classes Strukturore",
        en: "Structural Pseudo-Classes"
      },
      content: {
        sq: "Pseudo-classes strukturore zgjedhin elemente sipas pozicionit të tyre brenda një grupi vëllezërish ose sipas strukturës së dokumentit.",
        en: "Structural pseudo-classes select elements according to their position among siblings or the document structure."
      },
      concepts: [
        {
          name: ":first-child",
          sq: "Zgjedh elementin e parë fëmijë.",
          en: "Selects the first child element."
        },
        {
          name: ":last-child",
          sq: "Zgjedh elementin e fundit fëmijë.",
          en: "Selects the last child element."
        },
        {
          name: ":nth-child(n)",
          sq: "Zgjedh elemente sipas një modeli numerik.",
          en: "Selects elements according to a numeric pattern."
        },
        {
          name: ":nth-of-type(n)",
          sq: "Zgjedh elementin sipas pozicionit ndër elementet e të njëjtit lloj HTML.",
          en: "Selects an element by position among siblings of the same HTML element type."
        },
        {
          name: ":not(selector)",
          sq: "Zgjedh elementet që nuk përputhen me selektorin e dhënë.",
          en: "Selects elements that do not match the supplied selector."
        },
        {
          name: ":is(selector-list)",
          sq: "Grupon selektorë për të shkruar rregulla më të shkurtra.",
          en: "Groups selectors to write shorter rules."
        },
        {
          name: ":where(selector-list)",
          sq: "Ngjan me :is(), por selektori i saj ka specifikë zero.",
          en: "Similar to :is(), but its selector has zero specificity."
        },
        {
          name: ":has(selector)",
          sq: "Mund të zgjedhë një element bazuar në elementet që përmban ose marrëdhëniet e tij.",
          en: "Can select an element based on the elements it contains or its relationships."
        }
      ],
      example: `
.list > li:first-child {
  font-weight: 700;
}

.list > li:nth-child(even) {
  background: #f3f4f6;
}

.card:not(.card--featured) {
  border: 1px solid #e5e7eb;
}

:is(h1, h2, h3) {
  line-height: 1.2;
}

.card:has(img) {
  padding-top: 0;
}
`
    },

    // =====================================================
    // 3. PSEUDO-ELEMENTS
    // =====================================================
    {
      id: "pseudo-elements",
      title: {
        sq: "Pseudo-Elements",
        en: "Pseudo-Elements"
      },
      content: {
        sq: "Pseudo-elements stilizojnë një pjesë të elementit ose krijojnë një kuti dekorative të lidhur me të. Sintaksa moderne përdor dy pika, si ::before dhe ::after.",
        en: "Pseudo-elements style part of an element or create a decorative box associated with it. Modern syntax uses two colons, such as ::before and ::after."
      },
      concepts: [
        {
          name: "::before",
          sq: "Krijon një pseudo-element para përmbajtjes së elementit.",
          en: "Creates a pseudo-element before the element's content."
        },
        {
          name: "::after",
          sq: "Krijon një pseudo-element pas përmbajtjes së elementit.",
          en: "Creates a pseudo-element after the element's content."
        },
        {
          name: "::first-letter",
          sq: "Stilon shkronjën e parë të tekstit të përshtatshëm.",
          en: "Styles the first letter of eligible text."
        },
        {
          name: "::first-line",
          sq: "Stilon rreshtin e parë të tekstit të përshtatshëm.",
          en: "Styles the first line of eligible text."
        },
        {
          name: "::selection",
          sq: "Stilon tekstin e përzgjedhur nga përdoruesi.",
          en: "Styles text selected by the user."
        },
        {
          name: "::placeholder",
          sq: "Stilon tekstin udhëzues brenda input-eve.",
          en: "Styles placeholder text inside inputs."
        }
      ],
      example: `
.link {
  position: relative;
  text-decoration: none;
}

.link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 100%;
  height: 2px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 180ms ease;
}

.link:hover::after,
.link:focus-visible::after {
  transform: scaleX(1);
}

::selection {
  color: white;
  background: #2563eb;
}

input::placeholder {
  color: #6b7280;
}
`,
      bestPractices: [
        {
          sq: "Përdor content: \"\" për pseudo-elementet dekorative ::before dhe ::after.",
          en: "Use content: \"\" for decorative ::before and ::after pseudo-elements."
        },
        {
          sq: "Mos vendos informacion thelbësor vetëm në përmbajtje të krijuar nga CSS.",
          en: "Do not place essential information only in CSS-generated content."
        },
        {
          sq: "Përdor pseudo-elements kryesisht për dekorim dhe efekte vizuale.",
          en: "Use pseudo-elements primarily for decoration and visual effects."
        }
      ]
    },

    // =====================================================
    // 4. CSS TRANSITIONS
    // =====================================================
    {
      id: "css-transitions",
      title: {
        sq: "Transitions në CSS",
        en: "CSS Transitions"
      },
      content: {
        sq: "Transitions krijojnë kalime të buta midis vlerave të ndryshme CSS kur ndryshon gjendja e një elementi. Ato përdoren shpesh për hover, fokus, hapje panelesh dhe reagime të ndërfaqes.",
        en: "Transitions create smooth changes between CSS values when an element's state changes. They are commonly used for hover, focus, panel interactions, and interface feedback."
      },
      properties: [
        {
          name: "transition-property",
          sq: "Përcakton cilat prona do të animohen.",
          en: "Defines which properties will transition."
        },
        {
          name: "transition-duration",
          sq: "Përcakton kohëzgjatjen e kalimit.",
          en: "Defines the transition duration."
        },
        {
          name: "transition-timing-function",
          sq: "Kontrollon ritmin e ndryshimit.",
          en: "Controls the pacing of the transition."
        },
        {
          name: "transition-delay",
          sq: "Përcakton vonesën para fillimit.",
          en: "Defines the delay before the transition begins."
        }
      ],
      example: `
.button {
  background-color: #2563eb;
  transform: translateY(0);
  box-shadow: 0 2px 5px rgb(0 0 0 / 12%);
  transition:
    background-color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.button:hover {
  background-color: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgb(0 0 0 / 15%);
}
`,
      timingFunctions: [
        "linear",
        "ease",
        "ease-in",
        "ease-out",
        "ease-in-out",
        "cubic-bezier()"
      ],
      bestPractices: [
        {
          sq: "Përdor kohëzgjatje të shkurtra për reagimet e zakonshme të ndërfaqes.",
          en: "Use short durations for common interface feedback."
        },
        {
          sq: "Specifiko pronat konkrete në vend të transition: all kur dëshiron kontroll më të mirë.",
          en: "Specify concrete properties instead of transition: all when you need better control."
        },
        {
          sq: "Për lëvizje, prefero transform dhe opacity kur janë të përshtatshme.",
          en: "For motion, prefer transform and opacity when appropriate."
        }
      ]
    },

    // =====================================================
    // 5. CSS TRANSFORMS
    // =====================================================
    {
      id: "css-transforms",
      title: {
        sq: "Transformimet CSS",
        en: "CSS Transforms"
      },
      content: {
        sq: "transform ndryshon mënyrën se si një element vizatohet, pa ndryshuar domosdoshmërisht hapësirën që ai zë në rrjedhën normale të dokumentit.",
        en: "transform changes how an element is visually rendered without necessarily changing the space it occupies in normal document flow."
      },
      functions: [
        {
          name: "translate()",
          sq: "Zhvendos elementin përgjatë boshteve.",
          en: "Moves an element along the axes."
        },
        {
          name: "scale()",
          sq: "Zmadhon ose zvogëlon elementin.",
          en: "Scales an element up or down."
        },
        {
          name: "rotate()",
          sq: "Rrotullon elementin.",
          en: "Rotates an element."
        },
        {
          name: "skew()",
          sq: "Anon elementin përgjatë një ose dy boshteve.",
          en: "Skews an element along one or both axes."
        },
        {
          name: "matrix()",
          sq: "Përcakton transformim të kombinuar nëpërmjet një matrice.",
          en: "Defines a combined transformation through a matrix."
        }
      ],
      example: `
.card {
  transition: transform 200ms ease;
}

.card:hover {
  transform: translateY(-5px) scale(1.01);
}

.icon {
  transform: rotate(12deg);
}

.centered-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
`,
      notes: [
        {
          sq: "Transformimet mund të krijojnë stacking context të ri.",
          en: "Transforms can create a new stacking context."
        },
        {
          sq: "Transformimi vizual mund të mbivendoset me elementet e tjera pa ndryshuar layout-in e tyre.",
          en: "A visual transform can overlap other elements without changing their layout."
        }
      ]
    },

    // =====================================================
    // 6. TRANSFORM ORIGIN AND 3D
    // =====================================================
    {
      id: "transform-origin-3d",
      title: {
        sq: "Transform Origin dhe Transformime 3D",
        en: "Transform Origin and 3D Transforms"
      },
      content: {
        sq: "transform-origin përcakton pikën rreth së cilës kryhet transformimi. CSS mbështet gjithashtu transformime në hapësirë 3D me rrotullime dhe perspektivë.",
        en: "transform-origin defines the point around which a transformation occurs. CSS also supports 3D transformations using rotations and perspective."
      },
      example: `
.flip-card {
  perspective: 1000px;
}

.flip-card__inner {
  transform-style: preserve-3d;
  transition: transform 500ms ease;
}

.flip-card:hover .flip-card__inner {
  transform: rotateY(180deg);
}

.rotate-element {
  transform-origin: left center;
  transform: rotate(8deg);
}
`,
      properties: [
        {
          name: "transform-origin",
          sq: "Kontrollon pikën e nisjes së transformimit.",
          en: "Controls the origin point of a transform."
        },
        {
          name: "perspective",
          sq: "Ndikon në mënyrën si perceptohet thellësia e transformimeve 3D.",
          en: "Influences how depth is perceived in 3D transforms."
        },
        {
          name: "transform-style",
          sq: "Kontrollon nëse fëmijët ruajnë pozicionimin 3D.",
          en: "Controls whether children preserve their 3D positioning."
        },
        {
          name: "backface-visibility",
          sq: "Kontrollon nëse ana e pasme e elementit është e dukshme.",
          en: "Controls whether the back face of an element is visible."
        }
      ],
      warning: {
        sq: "Efektet 3D mund të ndikojnë në stacking context dhe në mënyrën si shfaqen elementet e fëmijëve. Testo sjelljen në shfletuesit që mbështet projekti.",
        en: "3D effects can affect stacking contexts and how child elements render. Test behavior in the browsers your project supports."
      }
    },

    // =====================================================
    // 7. KEYFRAME ANIMATIONS
    // =====================================================
    {
      id: "keyframe-animations",
      title: {
        sq: "Animacionet me @keyframes",
        en: "Animations with @keyframes"
      },
      content: {
        sq: "@keyframes përcakton fazat e një animacioni. Prona animation kontrollon kohëzgjatjen, përsëritjen, drejtimin, vonesën dhe gjendjen e elementit para ose pas animacionit.",
        en: "@keyframes defines the stages of an animation. The animation property controls duration, repetition, direction, delay, and the element's state before or after the animation."
      },
      example: `
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animated-card {
  animation: fade-in-up 500ms ease-out both;
}
`,
      properties: [
        {
          name: "animation-name",
          sq: "Emri i animacionit të përcaktuar te @keyframes.",
          en: "The name of the animation defined in @keyframes."
        },
        {
          name: "animation-duration",
          sq: "Kohëzgjatja e një cikli animacioni.",
          en: "The duration of one animation cycle."
        },
        {
          name: "animation-iteration-count",
          sq: "Numri i përsëritjeve ose vlera infinite.",
          en: "The number of iterations or the infinite value."
        },
        {
          name: "animation-direction",
          sq: "Kontrollon drejtimin e animacionit në çdo cikël.",
          en: "Controls the direction of the animation in each cycle."
        },
        {
          name: "animation-fill-mode",
          sq: "Kontrollon nëse stilet e animacionit mbahen para ose pas ekzekutimit.",
          en: "Controls whether animation styles are retained before or after execution."
        },
        {
          name: "animation-play-state",
          sq: "Lejon luajtjen ose pauzimin e animacionit.",
          en: "Allows the animation to run or pause."
        }
      ]
    },

    // =====================================================
    // 8. ANIMATION TIMING AND STAGGER
    // =====================================================
    {
      id: "animation-timing-stagger",
      title: {
        sq: "Timing dhe Stagger Animations",
        en: "Animation Timing and Stagger Effects"
      },
      content: {
        sq: "Stagger animations fillojnë elementet njëri pas tjetrit me vonesa të vogla. Kjo mund të krijojë hyrje vizuale më të organizuara, por duhet përdorur me masë.",
        en: "Stagger animations start items one after another with small delays. This can create more organized visual entrances, but should be used sparingly."
      },
      example: `
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.list-item {
  animation: reveal 350ms ease-out both;
}

.list-item:nth-child(1) {
  animation-delay: 0ms;
}

.list-item:nth-child(2) {
  animation-delay: 70ms;
}

.list-item:nth-child(3) {
  animation-delay: 140ms;
}

.list-item:nth-child(4) {
  animation-delay: 210ms;
}
`,
      bestPractices: [
        {
          sq: "Shmang vonesa të gjata për përmbajtje thelbësore që përdoruesi duhet ta shohë menjëherë.",
          en: "Avoid long delays for essential content users need to see immediately."
        },
        {
          sq: "Mos e përdor stagger për shumë elemente pa nevojë, sepse mund të ngadalësojë përvojën.",
          en: "Avoid staggering too many items unnecessarily, as it can slow the experience."
        },
        {
          sq: "Siguro që përmbajtja të jetë e disponueshme edhe kur animacionet reduktohen.",
          en: "Ensure content remains available when animations are reduced."
        }
      ]
    },

    // =====================================================
    // 9. CSS GRADIENTS
    // =====================================================
    {
      id: "css-gradients",
      title: {
        sq: "Gradient-et CSS",
        en: "CSS Gradients"
      },
      content: {
        sq: "Gradient-et krijojnë kalime midis ngjyrave pa kërkuar domosdoshmërisht skedarë imazhesh. Ato mund të përdoren për sfond, butona, dekorime dhe efekte ndriçimi.",
        en: "Gradients create transitions between colors without necessarily requiring image files. They can be used for backgrounds, buttons, decorations, and lighting effects."
      },
      types: [
        {
          name: "linear-gradient()",
          sq: "Kalimi i ngjyrave përgjatë një drejtimi.",
          en: "Color transition along a direction."
        },
        {
          name: "radial-gradient()",
          sq: "Kalimi i ngjyrave nga një zonë qendrore drejt jashtë.",
          en: "Color transition outward from a central area."
        },
        {
          name: "conic-gradient()",
          sq: "Kalimi i ngjyrave rreth një pike qendrore.",
          en: "Color transition around a central point."
        },
        {
          name: "repeating-linear-gradient()",
          sq: "Përsërit modele lineare ngjyrash.",
          en: "Repeats linear color patterns."
        }
      ],
      example: `
.hero {
  background:
    linear-gradient(
      120deg,
      #1d4ed8 0%,
      #7c3aed 55%,
      #db2777 100%
    );
}

.glow-panel {
  background:
    radial-gradient(
      circle at top right,
      rgb(96 165 250 / 35%),
      transparent 45%
    ),
    #111827;
}

.progress-ring {
  background:
    conic-gradient(
      #2563eb 0deg 270deg,
      #e5e7eb 270deg 360deg
    );
}
`
    },

    // =====================================================
    // 10. MULTIPLE BACKGROUNDS
    // =====================================================
    {
      id: "multiple-backgrounds",
      title: {
        sq: "Sfondet e Shumëfishta",
        en: "Multiple Backgrounds"
      },
      content: {
        sq: "CSS lejon disa imazhe ose gradient-e në të njëjtën pronë background. Sfondi i parë në listë vizatohet përpara sfondit pasues.",
        en: "CSS allows multiple images or gradients in the same background property. The first background in the list is painted in front of subsequent backgrounds."
      },
      example: `
.hero {
  background:
    linear-gradient(
      rgb(15 23 42 / 45%),
      rgb(15 23 42 / 80%)
    ),
    url("/images/hero.jpg") center / cover no-repeat;
}

.pattern {
  background:
    radial-gradient(
      circle,
      rgb(255 255 255 / 15%) 1px,
      transparent 1px
    ) 0 0 / 20px 20px,
    #111827;
}
`,
      notes: [
        {
          sq: "Sfondet dekorative mund të reduktojnë nevojën për imazhe shtesë.",
          en: "Decorative backgrounds can reduce the need for additional images."
        },
        {
          sq: "Siguro kontrast të mjaftueshëm kur teksti vendoset mbi gradient ose imazh.",
          en: "Ensure sufficient contrast when text is placed over gradients or images."
        }
      ]
    },

    // =====================================================
    // 11. FILTERS
    // =====================================================
    {
      id: "css-filters",
      title: {
        sq: "CSS Filters",
        en: "CSS Filters"
      },
      content: {
        sq: "filter aplikon efekte vizuale si blur, brightness, contrast, grayscale dhe drop-shadow. Efekti aplikohet në paraqitjen vizuale të elementit.",
        en: "filter applies visual effects such as blur, brightness, contrast, grayscale, and drop-shadow. The effect applies to the element's rendered appearance."
      },
      functions: [
        "blur()",
        "brightness()",
        "contrast()",
        "grayscale()",
        "sepia()",
        "saturate()",
        "hue-rotate()",
        "invert()",
        "opacity()",
        "drop-shadow()"
      ],
      example: `
.image {
  filter: saturate(0.8);
  transition: filter 250ms ease;
}

.image:hover {
  filter: saturate(1.15) contrast(1.05);
}

.glass-icon {
  filter: drop-shadow(0 4px 8px rgb(0 0 0 / 20%));
}
`,
      warning: {
        sq: "Filter-at mund të kenë kosto renderimi, veçanërisht kur përdoren blur i madh dhe animacion në sipërfaqe të mëdha.",
        en: "Filters can have rendering costs, especially when large blurs and animations are applied to large surfaces."
      }
    },

    // =====================================================
    // 12. BACKDROP FILTER AND GLASS EFFECT
    // =====================================================
    {
      id: "backdrop-filter-glass",
      title: {
        sq: "Backdrop Filter dhe Glassmorphism",
        en: "Backdrop Filter and Glassmorphism"
      },
      content: {
        sq: "backdrop-filter aplikon efekte mbi zonën që shihet pas elementit. Shpesh përdoret për sipërfaqe të tejdukshme me efekt xhami.",
        en: "backdrop-filter applies effects to the area visible behind an element. It is often used for translucent glass-like surfaces."
      },
      example: `
.glass-panel {
  background: rgb(255 255 255 / 72%);
  border: 1px solid rgb(255 255 255 / 45%);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 12%);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}
`,
      bestPractices: [
        {
          sq: "Siguro një ngjyrë sfondi rezervë për shfletuesit që nuk mbështesin efektin.",
          en: "Provide a fallback background color for browsers that do not support the effect."
        },
        {
          sq: "Kontrollo kontrastin e tekstit mbi sfondin e tejdukshëm.",
          en: "Check text contrast over translucent backgrounds."
        },
        {
          sq: "Mos përdor blur të rëndë në shumë elemente njëkohësisht pa testuar performancën.",
          en: "Avoid heavy blur on many elements at once without testing performance."
        }
      ]
    },

    // =====================================================
    // 13. CLIP-PATH
    // =====================================================
    {
      id: "clip-path",
      title: {
        sq: "Clip Path",
        en: "Clip Path"
      },
      content: {
        sq: "clip-path përcakton zonën e elementit që mbetet e dukshme. Mund të krijojë forma gjeometrike dhe efekte prerjeje.",
        en: "clip-path defines the portion of an element that remains visible. It can create geometric shapes and clipping effects."
      },
      example: `
.diagonal-panel {
  clip-path: polygon(
    0 0,
    100% 0,
    100% 80%,
    0 100%
  );
}

.circle-avatar {
  clip-path: circle(50%);
}

.diamond {
  clip-path: polygon(
    50% 0,
    100% 50%,
    50% 100%,
    0 50%
  );
}
`,
      concepts: [
        {
          name: "polygon()",
          sq: "Krijon një formë duke përcaktuar pikat e saj.",
          en: "Creates a shape by defining its points."
        },
        {
          name: "circle()",
          sq: "Krijon prerje rrethore.",
          en: "Creates a circular clipping shape."
        },
        {
          name: "ellipse()",
          sq: "Krijon prerje eliptike.",
          en: "Creates an elliptical clipping shape."
        },
        {
          name: "inset()",
          sq: "Krijon prerje drejtkëndore me kufij të brendshëm.",
          en: "Creates a rectangular clipping shape with inset edges."
        }
      ]
    },

    // =====================================================
    // 14. MASKING
    // =====================================================
    {
      id: "css-masking",
      title: {
        sq: "CSS Masking",
        en: "CSS Masking"
      },
      content: {
        sq: "Masking përdor një maskë për të kontrolluar transparencën ose dukshmërinë e pjesëve të një elementi. Maskat mund të bazohen në gradient ose burime të jashtme të përshtatshme.",
        en: "Masking uses a mask to control the transparency or visibility of parts of an element. Masks can be based on gradients or suitable external resources."
      },
      example: `
.fade-image {
  -webkit-mask-image: linear-gradient(
    to bottom,
    black 65%,
    transparent 100%
  );

  mask-image: linear-gradient(
    to bottom,
    black 65%,
    transparent 100%
  );
}

.fade-edge {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 15%,
    black 85%,
    transparent
  );

  mask-image: linear-gradient(
    to right,
    transparent,
    black 15%,
    black 85%,
    transparent
  );
}
`,
      notes: [
        {
          sq: "Në shumë maska, zonat opake mbeten të dukshme ndërsa zonat transparente fshihen.",
          en: "In many masks, opaque regions remain visible while transparent regions are hidden."
        },
        {
          sq: "Testo prefikset dhe mbështetjen e shfletuesve që synon.",
          en: "Test prefixes and support in your target browsers."
        }
      ]
    },

    // =====================================================
    // 15. BOX SHADOW AND TEXT SHADOW
    // =====================================================
    {
      id: "shadows",
      title: {
        sq: "Box Shadow dhe Text Shadow",
        en: "Box Shadow and Text Shadow"
      },
      content: {
        sq: "box-shadow krijon hije rreth kutisë së elementit. text-shadow krijon hije pas tekstit. Hijet mund të shtojnë thellësi, por duhet të përdoren në mënyrë konsistente.",
        en: "box-shadow creates shadows around an element's box. text-shadow creates shadows behind text. Shadows can add depth but should be used consistently."
      },
      example: `
.card {
  box-shadow:
    0 2px 4px rgb(0 0 0 / 6%),
    0 12px 30px rgb(0 0 0 / 8%);
}

.card:hover {
  box-shadow:
    0 8px 20px rgb(0 0 0 / 10%),
    0 20px 45px rgb(0 0 0 / 12%);
}

.hero-title {
  text-shadow: 0 2px 12px rgb(0 0 0 / 35%);
}

.inset-panel {
  box-shadow: inset 0 1px 4px rgb(0 0 0 / 10%);
}
`,
      concepts: [
        {
          name: "Offset X and Y",
          sq: "Kontrollojnë zhvendosjen horizontale dhe vertikale të hijes.",
          en: "Control the horizontal and vertical offset of the shadow."
        },
        {
          name: "Blur radius",
          sq: "Kontrollon sa e butë duket hija.",
          en: "Controls how soft the shadow appears."
        },
        {
          name: "Spread radius",
          sq: "Zgjeron ose zvogëlon zonën e hijes.",
          en: "Expands or contracts the shadow area."
        },
        {
          name: "Inset",
          sq: "Krijon hije brenda kutisë.",
          en: "Creates an inner shadow."
        }
      ]
    },

    // =====================================================
    // 16. BORDER EFFECTS AND OUTLINES
    // =====================================================
    {
      id: "border-effects",
      title: {
        sq: "Efekte të Kufijve dhe Outline",
        en: "Border Effects and Outlines"
      },
      content: {
        sq: "CSS ofron mënyra të ndryshme për të krijuar kufij, outline dhe efekte dekorative. outline është veçanërisht i rëndësishëm për treguesin e fokusit.",
        en: "CSS offers different ways to create borders, outlines, and decorative effects. outline is especially important for focus indicators."
      },
      example: `
.input {
  border: 1px solid #9ca3af;
  border-radius: 8px;
}

.input:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 2px;
  border-color: #2563eb;
}

.gradient-border {
  border: 1px solid transparent;
  border-radius: 16px;
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(120deg, #2563eb, #a855f7) border-box;
}
`,
      bestPractices: [
        {
          sq: "Mos e hiq outline-in e fokusit pa ofruar një zëvendësim të qartë.",
          en: "Do not remove the focus outline without providing a clear replacement."
        },
        {
          sq: "Përdor border-radius në mënyrë konsistente nëpër komponentë.",
          en: "Use border-radius consistently across components."
        }
      ]
    },

    // =====================================================
    // 17. BLEND MODES
    // =====================================================
    {
      id: "blend-modes",
      title: {
        sq: "Blend Modes",
        en: "Blend Modes"
      },
      content: {
        sq: "Blend modes kontrollojnë mënyrën si ngjyrat e një elementi përzihen me sfondin. Ato mund të përdoren për efekte artistike dhe përpunim vizual.",
        en: "Blend modes control how an element's colors blend with the background. They can be used for artistic effects and visual treatments."
      },
      properties: [
        {
          name: "mix-blend-mode",
          sq: "Përcakton si përzihet përmbajtja e elementit me përmbajtjen pas tij.",
          en: "Defines how an element's content blends with the content behind it."
        },
        {
          name: "background-blend-mode",
          sq: "Përcakton si përzihen shtresat e sfondit të një elementi.",
          en: "Defines how an element's background layers blend with each other."
        }
      ],
      example: `
.image-overlay {
  background:
    linear-gradient(120deg, #2563eb, #9333ea),
    url("/images/texture.jpg") center / cover;

  background-blend-mode: multiply;
}

.blend-title {
  mix-blend-mode: difference;
  color: white;
}
`,
      warning: {
        sq: "Blend modes mund të japin rezultate të ndryshme në varësi të ngjyrave dhe kontekstit të shtresave. Kontrollo kontrastin dhe lexueshmërinë.",
        en: "Blend modes can produce different results depending on colors and layer context. Check contrast and readability."
      }
    },

    // =====================================================
    // 18. CSS COUNTERS
    // =====================================================
    {
      id: "css-counters",
      title: {
        sq: "CSS Counters",
        en: "CSS Counters"
      },
      content: {
        sq: "CSS counters krijojnë numërues që mund të përdoren për numërim vizual të seksioneve, hapave ose titujve.",
        en: "CSS counters create counters that can be used to visually number sections, steps, or headings."
      },
      example: `
.steps {
  counter-reset: step;
}

.step {
  counter-increment: step;
}

.step::before {
  content: counter(step);
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  margin-inline-end: 0.75rem;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  font-weight: 700;
}
`,
      notes: [
        {
          sq: "CSS counters janë për paraqitje vizuale; numërimi semantik dhe kuptimi i përmbajtjes duhet të mbeten të qarta në HTML.",
          en: "CSS counters are for visual presentation; semantic numbering and content meaning should remain clear in HTML."
        }
      ]
    },

    // =====================================================
    // 19. CUSTOM PROPERTIES FOR THEMES
    // =====================================================
    {
      id: "theme-custom-properties",
      title: {
        sq: "CSS Variables për Tema",
        en: "CSS Custom Properties for Themes"
      },
      content: {
        sq: "CSS custom properties lejojnë krijimin e një sistemi të përbashkët ngjyrash, hapësirash dhe hijesh. Ato janë të dobishme për tema light/dark dhe për mirëmbajtjen e dizajnit.",
        en: "CSS custom properties allow a shared system of colors, spacing, and shadows. They are useful for light/dark themes and design-system maintenance."
      },
      example: `
:root {
  color-scheme: light;

  --color-bg: #ffffff;
  --color-text: #111827;
  --color-surface: #f3f4f6;
  --color-border: #d1d5db;
  --color-primary: #2563eb;
  --shadow-card: 0 8px 24px rgb(0 0 0 / 8%);
}

[data-theme="dark"] {
  color-scheme: dark;

  --color-bg: #111827;
  --color-text: #f9fafb;
  --color-surface: #1f2937;
  --color-border: #374151;
  --color-primary: #93c5fd;
  --shadow-card: 0 8px 24px rgb(0 0 0 / 25%);
}

body {
  color: var(--color-text);
  background: var(--color-bg);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}
`,
      bestPractices: [
        {
          sq: "Përdor emra semantikë si --color-surface në vend të emrave të lidhur vetëm me një ngjyrë specifike.",
          en: "Use semantic names such as --color-surface instead of names tied only to a specific color."
        },
        {
          sq: "Siguro kontrast të përshtatshëm në secilën temë.",
          en: "Ensure appropriate contrast in each theme."
        },
        {
          sq: "Përdor një strategji të qartë për aktivizimin e temës, për shembull data-theme ose prefers-color-scheme.",
          en: "Use a clear theme activation strategy, such as data-theme or prefers-color-scheme."
        }
      ]
    },

    // =====================================================
    // 20. COLOR SCHEME PREFERENCE
    // =====================================================
    {
      id: "color-scheme-preference",
      title: {
        sq: "Preferenca për Light dhe Dark Mode",
        en: "Light and Dark Mode Preferences"
      },
      content: {
        sq: "prefers-color-scheme lejon që faqja të zbulojë nëse përdoruesi preferon një pamje të çelët apo të errët. Projekti mund ta respektojë këtë preferencë ose të ofrojë një kontroll manual.",
        en: "prefers-color-scheme allows a page to detect whether the user prefers a light or dark appearance. A project can respect this preference or provide a manual control."
      },
      example: `
:root {
  color-scheme: light dark;

  --background: #ffffff;
  --foreground: #111827;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #111827;
    --foreground: #f9fafb;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
}
`,
      note: {
        sq: "Nëse ofron kontroll manual të temës, përcakto qartë nëse ai ka përparësi ndaj preferencës së sistemit.",
        en: "If you provide a manual theme control, define clearly whether it takes precedence over the system preference."
      }
    },

    // =====================================================
    // 21. SCROLL-DRIVEN ANIMATIONS
    // =====================================================
    {
      id: "scroll-driven-animations",
      title: {
        sq: "Animacione të Drejtuara nga Scroll",
        en: "Scroll-Driven Animations"
      },
      content: {
        sq: "CSS modern mbështet animacione që lidhen me progresin e scroll-it ose me hyrjen e një elementi në zonën e dukshme. Mbështetja mund të ndryshojë sipas shfletuesit, prandaj këto efekte duhet të kenë një paraqitje rezervë.",
        en: "Modern CSS supports animations linked to scroll progress or an element entering the visible area. Browser support can vary, so these effects should have a fallback presentation."
      },
      example: `
@keyframes reading-progress {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}

.scroll-progress {
  position: fixed;
  inset: 0 auto auto 0;
  width: 100%;
  height: 4px;
  background: #2563eb;
  transform-origin: left;
  animation: reading-progress linear both;
  animation-timeline: scroll(root block);
}
`,
      notes: [
        {
          sq: "Kontrollo mbështetjen e shfletuesve për animation-timeline dhe scroll timelines.",
          en: "Check browser support for animation-timeline and scroll timelines."
        },
        {
          sq: "Mos e bëj përmbajtjen thelbësore të varur vetëm nga një animacion i lidhur me scroll.",
          en: "Do not make essential content depend solely on a scroll-driven animation."
        },
        {
          sq: "Testo performancën dhe preferencat për lëvizje të reduktuar.",
          en: "Test performance and reduced-motion preferences."
        }
      ]
    },

    // =====================================================
    // 22. VIEW TRANSITIONS
    // =====================================================
    {
      id: "view-transitions",
      title: {
        sq: "View Transitions API dhe CSS",
        en: "View Transitions API and CSS"
      },
      content: {
        sq: "View Transitions mundësojnë kalime vizuale midis gjendjeve ose faqeve në kontekste të mbështetura. CSS kontrollon pamjen e elementeve të tranzicionit, ndërsa nisja e tranzicionit mund të kërkojë JavaScript ose mekanizma të navigimit të mbështetur.",
        en: "View Transitions enable visual transitions between states or pages in supported contexts. CSS controls the appearance of transition elements, while starting a transition may require JavaScript or supported navigation mechanisms."
      },
      example: `
@keyframes view-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

::view-transition-new(root) {
  animation: view-fade-in 250ms ease-out;
}
`,
      notes: [
        {
          sq: "View Transitions nuk aktivizohen vetëm nga CSS në çdo rast; mekanizmi që nis tranzicionin varet nga lloji i navigimit ose ndryshimit.",
          en: "View Transitions are not started by CSS alone in every case; the mechanism depends on the type of navigation or state change."
        },
        {
          sq: "Kontrollo mbështetjen e shfletuesve dhe siguro një përvojë funksionale pa tranzicion.",
          en: "Check browser support and ensure a functional experience without the transition."
        }
      ]
    },

    // =====================================================
    // 23. PERFORMANCE OF VISUAL EFFECTS
    // =====================================================
    {
      id: "effects-performance",
      title: {
        sq: "Performanca e Efekteve Vizuale",
        en: "Visual Effects Performance"
      },
      content: {
        sq: "Efektet vizuale mund të ndikojnë në performancë, veçanërisht kur shumë elemente të mëdha animohen njëkohësisht. Testimi duhet të përfshijë pajisje dhe shfletues të ndryshëm.",
        en: "Visual effects can affect performance, especially when many large elements animate simultaneously. Testing should include different devices and browsers."
      },
      bestPractices: [
        {
          sq: "Prefero transform dhe opacity për animacione të zakonshme kur janë të përshtatshme.",
          en: "Prefer transform and opacity for common animations when appropriate."
        },
        {
          sq: "Shmang animimin e vazhdueshëm të pronave që kërkojnë layout të shpeshtë, nëse ka alternativë më të përshtatshme.",
          en: "Avoid continuously animating properties that trigger frequent layout when a more suitable alternative exists."
        },
        {
          sq: "Përdor blur, shadow dhe filter me masë.",
          en: "Use blur, shadow, and filter effects sparingly."
        },
        {
          sq: "Përdor will-change vetëm pas identifikimit të një problemi real performance.",
          en: "Use will-change only after identifying a real performance issue."
        },
        {
          sq: "Hiq animacionet e panevojshme kur përdoruesi preferon lëvizje të reduktuar.",
          en: "Remove unnecessary animations when the user prefers reduced motion."
        }
      ],
      example: `
.animated-panel {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.animated-panel.is-hidden {
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .animated-panel {
    transition: none;
  }
}
`
    },

    // =====================================================
    // 24. ACCESSIBILITY FOR EFFECTS
    // =====================================================
    {
      id: "effects-accessibility",
      title: {
        sq: "Aksesueshmëria e Efekteve CSS",
        en: "Accessibility of CSS Effects"
      },
      content: {
        sq: "Efektet vizuale duhet të mbështesin përmbajtjen dhe funksionin e ndërfaqes, jo të pengojnë përdorimin. Fokusimi, kontrasti, reduktimi i lëvizjes dhe qartësia e gjendjeve janë thelbësore.",
        en: "Visual effects should support the interface's content and function rather than obstruct use. Focus, contrast, reduced motion, and clear states are essential."
      },
      checklist: [
        {
          sq: "Ruaj tregues të dukshëm të fokusit për navigimin me tastierë.",
          en: "Keep visible focus indicators for keyboard navigation."
        },
        {
          sq: "Mos përdor vetëm ngjyrën për të dalluar gjendjet e rëndësishme.",
          en: "Do not rely on color alone to distinguish important states."
        },
        {
          sq: "Siguro që teksti mbi imazhe dhe gradient-e të ketë kontrast të mjaftueshëm.",
          en: "Ensure text over images and gradients has sufficient contrast."
        },
        {
          sq: "Respekto prefers-reduced-motion.",
          en: "Respect prefers-reduced-motion."
        },
        {
          sq: "Mos e fsheh përmbajtjen thelbësore vetëm për shkak të një efekti animacioni.",
          en: "Do not hide essential content solely because of an animation effect."
        }
      ]
    },

    // =====================================================
    // 25. COMMON ADVANCED CSS MISTAKES
    // =====================================================
    {
      id: "advanced-css-mistakes",
      title: {
        sq: "Gabimet e Zakonshme në CSS të Avancuar",
        en: "Common Advanced CSS Mistakes"
      },
      mistakes: [
        {
          problem: "Removing focus outlines",
          sq: "Përdoruesit e tastierës mund të humbasin orientimin.",
          en: "Keyboard users may lose their visual orientation.",
          solution: "Provide a clear :focus-visible style."
        },
        {
          problem: "Animating every property",
          sq: "Mund të shkaktojë kalime të papritura dhe punë të panevojshme renderimi.",
          en: "Can cause unexpected transitions and unnecessary rendering work.",
          solution: "Specify the properties that should transition."
        },
        {
          problem: "Using excessive blur and shadows",
          sq: "Mund të rëndojë paraqitjen dhe të ulë qartësinë vizuale.",
          en: "Can make rendering heavier and reduce visual clarity.",
          solution: "Use a consistent and restrained visual system."
        },
        {
          problem: "Putting essential text in pseudo-elements",
          sq: "Informacioni mund të mos jetë i disponueshëm në mënyrë të besueshme për të gjitha teknologjitë ndihmëse.",
          en: "The information may not be reliably available to all assistive technologies.",
          solution: "Place essential content in semantic HTML."
        },
        {
          problem: "Ignoring reduced motion",
          sq: "Animacionet mund të shkaktojnë shqetësim te disa përdorues.",
          en: "Animations can cause discomfort for some users.",
          solution: "Provide a reduced-motion alternative."
        },
        {
          problem: "Relying on unsupported effects without fallback",
          sq: "Disa shfletues mund të mos shfaqin efektin e synuar.",
          en: "Some browsers may not render the intended effect.",
          solution: "Provide a usable base style and test target browsers."
        }
      ]
    },

    // =====================================================
    // 26. ADVANCED CSS GLOSSARY
    // =====================================================
    {
      id: "advanced-css-glossary",
      title: {
        sq: "Fjalor i CSS Advanced Styling",
        en: "Advanced CSS Styling Glossary"
      },
      terms: [
        {
          term: "Pseudo-Class",
          sq: "Selektor që përputhet me gjendjen ose marrëdhënien e një elementi.",
          en: "A selector that matches an element's state or relationship."
        },
        {
          term: "Pseudo-Element",
          sq: "Selektor që stilizon një pjesë të elementit ose një kuti të krijuar nga CSS.",
          en: "A selector that styles part of an element or a CSS-generated box."
        },
        {
          term: "Transition",
          sq: "Kalimi i butë midis vlerave të ndryshme CSS.",
          en: "A smooth change between different CSS values."
        },
        {
          term: "Transform",
          sq: "Ndryshim vizual i pozicionit, madhësisë, rrotullimit ose formës së elementit.",
          en: "A visual change to an element's position, size, rotation, or shape."
        },
        {
          term: "Keyframes",
          sq: "Pika të përcaktuara të një animacioni CSS.",
          en: "Defined stages of a CSS animation."
        },
        {
          term: "Gradient",
          sq: "Kalimi gradual midis dy ose më shumë ngjyrave.",
          en: "A gradual transition between two or more colors."
        },
        {
          term: "Filter",
          sq: "Efekt vizual i aplikuar mbi paraqitjen e elementit.",
          en: "A visual effect applied to an element's rendered appearance."
        },
        {
          term: "Backdrop Filter",
          sq: "Efekt i aplikuar mbi zonën e dukshme pas një elementi.",
          en: "An effect applied to the visible area behind an element."
        },
        {
          term: "Clip Path",
          sq: "Përcakton formën që mbetet e dukshme.",
          en: "Defines the shape of the visible region."
        },
        {
          term: "Mask",
          sq: "Kontrollon dukshmërinë ose transparencën e pjesëve të një elementi.",
          en: "Controls the visibility or transparency of parts of an element."
        },
        {
          term: "Blend Mode",
          sq: "Përcakton mënyrën si ngjyrat e shtresave përzihen.",
          en: "Defines how layer colors blend together."
        },
        {
          term: "Reduced Motion",
          sq: "Preferencë e përdoruesit për të reduktuar animacionet dhe lëvizjet.",
          en: "A user preference for reducing animations and motion."
        }
      ]
    }
  ]
};

// CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = cssAdvancedStylingKnowledge;
}
