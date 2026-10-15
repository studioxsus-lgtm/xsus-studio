// ============================================================================
// XSUS AI - HTML FUNDAMENTALS MASTER KNOWLEDGE BASE
// Version: 1.0.0 (Bilingual Structured Engine)
// ============================================================================

export const htmlFundamentalsKnowledge = {

  // ==========================================
  // 1. HTML FUNDAMENTALS & DOCUMENT STRUCTURE
  // ==========================================
  htmlFundamentals: {
    title: {
      sq: "Bazat dhe struktura e HTML-it",
      en: "HTML Fundamentals and Document Structure"
    },

    topics: {
      doctype: {
        sq: "<!DOCTYPE html> deklaron që dokumenti përdor standardin modern HTML dhe ndihmon shfletuesin të përdorë mënyrën standarde të paraqitjes.",
        en: "<!DOCTYPE html> declares a modern HTML document and helps the browser use standards mode."
      },

      htmlElement: {
        sq: "Elementi <html> është elementi rrënjë që përmban të gjithë dokumentin HTML. Atributi lang përcakton gjuhën kryesore të përmbajtjes.",
        en: "The <html> element is the root element containing the entire HTML document. The lang attribute identifies the primary content language."
      },

      headElement: {
        sq: "Elementi <head> përmban metadata, titullin e faqes, lidhjet me burime të jashtme dhe informacione të tjera që zakonisht nuk shfaqen si përmbajtje kryesore.",
        en: "The <head> element contains metadata, the page title, links to external resources, and other information that is not normally displayed as main content."
      },

      bodyElement: {
        sq: "Elementi <body> përmban përmbajtjen që shfaqet në faqen web, si tituj, paragrafë, imazhe, lidhje dhe formularë.",
        en: "The <body> element contains the web page content, such as headings, paragraphs, images, links, and forms."
      },

      metadata: {
        sq: "Metadata jep informacione rreth dokumentit. Shembujt përfshijnë charset, viewport, description dhe title.",
        en: "Metadata provides information about the document. Examples include charset, viewport, description, and title."
      },

      comments: {
        sq: "Komentet HTML shkruhen me <!-- dhe -->. Ato nuk shfaqen si përmbajtje normale në faqe, por mund të shihen në kodin burimor.",
        en: "HTML comments are written with <!-- and -->. They do not appear as normal page content but can be seen in the source code."
      }
    },

    example: `
<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Faqja demonstrative e XSUS AI">
  <title>XSUS AI - Faqja Kryesore</title>
</head>
<body>
  <header>
    <h1>Mirë se erdhe në XSUS AI</h1>
  </header>

  <main>
    <p>Kjo është një faqe e krijuar me HTML.</p>
  </main>
</body>
</html>
`
  },

  // ==========================================
  // 2. TAGS, ELEMENTS & ATTRIBUTES
  // ==========================================
  elementsAndAttributes: {
    title: {
      sq: "Etiketat, elementet dhe atributet",
      en: "Tags, Elements, and Attributes"
    },

    topics: {
      tagsAndElements: {
        sq: "Etiketa është shënimi i kodit, ndërsa elementi përfshin etiketat përkatëse dhe përmbajtjen e tyre, kur ka përmbajtje.",
        en: "A tag is markup syntax, while an element includes its relevant tags and content, when applicable."
      },

      openingAndClosingTags: {
        sq: "Shumë elemente kanë etiketë hapëse dhe mbyllëse, si <p>Teksti</p>. Disa elemente, si <img> dhe <br>, nuk kanë etiketë mbyllëse.",
        en: "Many elements have opening and closing tags, such as <p>Text</p>. Some elements, such as <img> and <br>, have no closing tag."
      },

      attributes: {
        sq: "Atributet vendosen në etiketën hapëse dhe përcaktojnë veti ose informacione shtesë, si id, class, href, src, alt dhe title.",
        en: "Attributes are placed in the opening tag and define properties or additional information, such as id, class, href, src, alt, and title."
      },

      idAttribute: {
        sq: "Atributi id identifikon një element në mënyrë unike brenda dokumentit. Vlera e tij duhet të jetë unike në atë dokument.",
        en: "The id attribute uniquely identifies an element within a document. Its value should be unique in that document."
      },

      classAttribute: {
        sq: "Atributi class i cakton elementit një ose më shumë klasa, të cilat mund të përdoren për grupim dhe stilim.",
        en: "The class attribute assigns one or more classes to an element for grouping and styling."
      },

      globalAttributes: {
        sq: "Atributet globale mund të përdoren në shumë elemente HTML. Shembuj janë id, class, title, lang, hidden, tabindex dhe data-*.",
        en: "Global attributes can be used on many HTML elements. Examples include id, class, title, lang, hidden, tabindex, and data-*."
      }
    },

    example: `
<section id="about" class="content-section" lang="sq">
  <h2 title="Titulli i seksionit">Rreth nesh</h2>
  <p class="description">Mëso bazat e HTML-it.</p>
  <img src="logo.png" alt="Logo e XSUS AI">
</section>
`
  },

  // ==========================================
  // 3. HEADINGS & TEXT CONTENT
  // ==========================================
  textContent: {
    title: {
      sq: "Titujt dhe përmbajtja tekstuale",
      en: "Headings and Text Content"
    },

    topics: {
      headings: {
        sq: "Titujt <h1> deri <h6> krijojnë hierarkinë e dokumentit. Përdori sipas strukturës logjike të përmbajtjes, jo vetëm për madhësinë vizuale.",
        en: "Headings <h1> through <h6> create document hierarchy. Use them according to the logical structure of the content, not merely for visual size."
      },

      paragraphs: {
        sq: "Elementi <p> paraqet një paragraf teksti.",
        en: "The <p> element represents a paragraph of text."
      },

      strongAndEm: {
        sq: "<strong> shënon rëndësi të madhe, ndërsa <em> shënon theksim. Kuptimi i tyre është semantik, jo vetëm pamor.",
        en: "<strong> indicates strong importance, while <em> indicates emphasis. Their meaning is semantic, not merely visual."
      },

      lineBreaks: {
        sq: "<br> krijon një ndërprerje rreshti. Përdore kur ndarja e rreshtit është pjesë e përmbajtjes, jo për të krijuar hapësira të mëdha.",
        en: "<br> creates a line break. Use it when the line break is part of the content, not to create large spaces."
      },

      thematicBreak: {
        sq: "<hr> përfaqëson një ndarje tematike ndërmjet pjesëve të përmbajtjes.",
        en: "<hr> represents a thematic break between sections of content."
      },

      quotations: {
        sq: "<blockquote> përdoret për citime të gjata, ndërsa <q> për citime të shkurtra brenda tekstit.",
        en: "<blockquote> is used for longer quotations, while <q> is used for short inline quotations."
      },

      codeText: {
        sq: "<code> shënon tekst që përfaqëson kod, ndërsa <pre> ruan hapësirat dhe rreshtat e tekstit të paraformatuar.",
        en: "<code> marks text representing code, while <pre> preserves whitespace and line breaks in preformatted text."
      }
    },

    example: `
<article>
  <h1>Udhëzuesi HTML</h1>
  <p>HTML përcakton strukturën e një faqeje web.</p>

  <h2>Elementet semantike</h2>
  <p><strong>Rëndësi:</strong> përdor elementet sipas kuptimit të tyre.</p>
  <p><em>Theksim:</em> thekso fjalët kur është e nevojshme.</p>

  <blockquote>
    Struktura e mirë e bën përmbajtjen më të kuptueshme.
  </blockquote>

  <p>Elementi <code>&lt;main&gt;</code> shënon përmbajtjen kryesore.</p>
  <hr>
</article>
`
  },

  // ==========================================
  // 4. LISTS
  // ==========================================
  lists: {
    title: {
      sq: "Listat në HTML",
      en: "HTML Lists"
    },

    topics: {
      unorderedList: {
        sq: "<ul> krijon listë të parenditur, ku renditja nuk është thelbësore.",
        en: "<ul> creates an unordered list where the sequence is not essential."
      },

      orderedList: {
        sq: "<ol> krijon listë të renditur. Atributet start, reversed dhe type mund të kontrollojnë paraqitjen e renditjes.",
        en: "<ol> creates an ordered list. The start, reversed, and type attributes can control its numbering."
      },

      listItems: {
        sq: "<li> përfaqëson një element të listës dhe përdoret brenda listave të përshtatshme.",
        en: "<li> represents a list item and is used inside appropriate list containers."
      },

      descriptionList: {
        sq: "<dl> krijon listë përshkrimi, <dt> shënon termin dhe <dd> përshkrimin e tij.",
        en: "<dl> creates a description list, <dt> identifies a term, and <dd> provides its description."
      },

      nestedLists: {
        sq: "Listat e ndërthurura vendosin një listë brenda një elementi <li> për të paraqitur nënkategori.",
        en: "Nested lists place one list inside an <li> element to represent subcategories."
      }
    },

    example: `
<h2>Temat e kursit</h2>
<ul>
  <li>HTML
    <ul>
      <li>Struktura</li>
      <li>Formularët</li>
    </ul>
  </li>
  <li>CSS</li>
</ul>

<h2>Hapat e projektit</h2>
<ol>
  <li>Planifikimi</li>
  <li>Krijimi i strukturës</li>
  <li>Testimi</li>
</ol>

<dl>
  <dt>HTML</dt>
  <dd>Gjuhë shënjimi për strukturën e përmbajtjes.</dd>
  <dt>Element</dt>
  <dd>Pjesë strukturore e dokumentit HTML.</dd>
</dl>
`
  },

  // ==========================================
  // 5. LINKS & NAVIGATION
  // ==========================================
  links: {
    title: {
      sq: "Lidhjet dhe navigimi",
      en: "Links and Navigation"
    },

    topics: {
      anchorElement: {
        sq: "Elementi <a> krijon lidhje përmes atributit href. Teksti i lidhjes duhet të tregojë qartë destinacionin ose qëllimin e saj.",
        en: "The <a> element creates links through the href attribute. Link text should clearly communicate its destination or purpose."
      },

      absoluteAndRelativeURLs: {
        sq: "URL-të absolute përmbajnë adresën e plotë, ndërsa URL-të relative interpretohen në raport me adresën bazë të dokumentit.",
        en: "Absolute URLs contain a complete address, while relative URLs are resolved in relation to the document's base address."
      },

      fragmentLinks: {
        sq: "Një lidhje me #id mund të çojë te një element që ka atë id brenda faqes.",
        en: "A link using #id can navigate to an element with that id within the page."
      },

      emailAndTelephone: {
        sq: "Skemat mailto: dhe tel: mund të krijojnë lidhje për email dhe telefon, nëse pajisja e përdoruesit i mbështet.",
        en: "The mailto: and tel: schemes can create email and telephone links when supported by the user's device."
      },

      newTabSecurity: {
        sq: "Kur një lidhje e jashtme hapet me target='_blank', përdor rel='noopener' për të kufizuar qasjen e faqes së hapur te dritarja burimore. noreferrer mund të kufizojë edhe dërgimin e referuesit.",
        en: "When an external link opens with target='_blank', use rel='noopener' to restrict the opened page's access to the originating window. noreferrer can also suppress referrer information."
      }
    },

    example: `
<nav aria-label="Navigimi kryesor">
  <a href="#about">Rreth nesh</a>
  <a href="#services">Shërbimet</a>
  <a href="https://example.com"
     target="_blank"
     rel="noopener noreferrer">
    Faqe e jashtme
  </a>
</nav>

<main>
  <section id="about">
    <h2>Rreth nesh</h2>
    <p>Informacion për projektin.</p>
  </section>

  <section id="services">
    <h2>Shërbimet</h2>
    <p>Informacion për shërbimet.</p>
  </section>
</main>

<p><a href="mailto:info@example.com">Na dërgo email</a></p>
`
  },

  // ==========================================
  // 6. IMAGES & IMAGE ACCESSIBILITY
  // ==========================================
  images: {
    title: {
      sq: "Imazhet dhe aksesueshmëria e tyre",
      en: "Images and Image Accessibility"
    },

    topics: {
      imgElement: {
        sq: "<img> vendos një imazh në dokument. Atributi src përcakton burimin dhe alt ofron tekst alternativ kur imazhi ka kuptim.",
        en: "<img> places an image in the document. The src attribute identifies the source and alt provides alternative text when the image is meaningful."
      },

      alternativeText: {
        sq: "Teksti alt duhet të përshkruajë funksionin ose informacionin e rëndësishëm të imazhit. Për imazhet thjesht dekorative përdoret alt bosh: alt=''.",
        en: "Alternative text should describe an image's function or important information. For purely decorative images, use an empty alt attribute: alt=''."
      },

      widthAndHeight: {
        sq: "Atributet width dhe height mund të ndihmojnë në përcaktimin e dimensioneve dhe në uljen e zhvendosjeve të papritura të faqes gjatë ngarkimit.",
        en: "The width and height attributes can define dimensions and help reduce unexpected layout shifts during loading."
      },

      figureAndCaption: {
        sq: "<figure> grupon përmbajtje të pavarur si imazhe, ndërsa <figcaption> jep përshkrimin e saj.",
        en: "<figure> groups self-contained content such as images, while <figcaption> provides its caption."
      },

      responsiveImages: {
        sq: "<picture>, <source> dhe atributi srcset mundësojnë zgjedhjen e imazheve të përshtatshme sipas ekranit ose rezolucionit.",
        en: "<picture>, <source>, and the srcset attribute enable selecting suitable images based on screen conditions or resolution."
      },

      lazyLoading: {
        sq: "loading='lazy' mund të shtyjë ngarkimin e imazheve jashtë zonës së dukshme. Mos e përdor pa menduar për imazhin kryesor që duhet shfaqur menjëherë.",
        en: "loading='lazy' can defer loading images outside the visible area. Avoid using it indiscriminately for the main image that should appear immediately."
      }
    },

    example: `
<figure>
  <img
    src="images/team.jpg"
    alt="Ekipi i XSUS AI duke punuar së bashku"
    width="800"
    height="450"
    loading="lazy">
  <figcaption>Ekipi ynë gjatë punës.</figcaption>
</figure>

<img
  src="images/decorative-line.svg"
  alt=""
  width="300"
  height="10">
`
  },

  // ==========================================
  // 7. AUDIO & VIDEO
  // ==========================================
  multimedia: {
    title: {
      sq: "Audio dhe video në HTML",
      en: "Audio and Video in HTML"
    },

    topics: {
      audioElement: {
        sq: "<audio> vendos përmbajtje zanore. Atributi controls shfaq kontrollet për përdoruesin.",
        en: "<audio> embeds audio content. The controls attribute displays user controls."
      },

      videoElement: {
        sq: "<video> vendos përmbajtje video dhe mund të përdorë width, height, controls, poster dhe preload.",
        en: "<video> embeds video content and can use width, height, controls, poster, and preload."
      },

      sourceElement: {
        sq: "<source> lejon përcaktimin e disa burimeve mediatike, që shfletuesi të zgjedhë një format të mbështetur.",
        en: "<source> allows multiple media sources so the browser can select a supported format."
      },

      captions: {
        sq: "<track> mundëson shtimin e titrave dhe përshkrimeve tekstuale. Titrat janë të rëndësishëm për përdoruesit që nuk mund ta dëgjojnë audion.",
        en: "<track> enables captions and other text tracks. Captions are important for users who cannot hear the audio."
      }
    },

    example: `
<video controls width="640" height="360" poster="images/preview.jpg">
  <source src="media/tutorial.mp4" type="video/mp4">
  <track
    src="media/captions-sq.vtt"
    kind="captions"
    srclang="sq"
    label="Shqip">
  Shfletuesi yt nuk e mbështet videon.
</video>

<audio controls>
  <source src="media/introduction.mp3" type="audio/mpeg">
  Shfletuesi yt nuk e mbështet audion.
</audio>
`
  },

  // ==========================================
  // 8. HTML TABLES
  // ==========================================
  tables: {
    title: {
      sq: "Tabelat dhe të dhënat në HTML",
      en: "HTML Tables and Data"
    },

    topics: {
      tableStructure: {
        sq: "<table> krijon tabelën, <tr> krijon rreshtin, <th> shënon qelizën e titullit dhe <td> qelizën e të dhënave.",
        en: "<table> creates a table, <tr> creates a row, <th> marks a header cell, and <td> marks a data cell."
      },

      tableSections: {
        sq: "<thead>, <tbody> dhe <tfoot> grupojnë pjesën e titujve, trupin dhe përmbledhjen e tabelës.",
        en: "<thead>, <tbody>, and <tfoot> group the table header, body, and footer."
      },

      captions: {
        sq: "<caption> jep një titull ose përshkrim për tabelën.",
        en: "<caption> provides a title or description for the table."
      },

      scopeAttribute: {
        sq: "Atributi scope te <th> ndihmon në identifikimin e qelizave që titulli përshkruan, si col ose row.",
        en: "The scope attribute on <th> helps identify the cells described by the header, such as a column or row."
      },

      spanning: {
        sq: "colspan bashkon qeliza në disa kolona, ndërsa rowspan bashkon qeliza në disa rreshta.",
        en: "colspan spans cells across columns, while rowspan spans cells across rows."
      }
    },

    example: `
<table>
  <caption>Anëtarët e ekipit</caption>
  <thead>
    <tr>
      <th scope="col">Emri</th>
      <th scope="col">Roli</th>
      <th scope="col">Statusi</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Arta</th>
      <td>Zhvilluese</td>
      <td>Aktive</td>
    </tr>
    <tr>
      <th scope="row">Dritani</th>
      <td>Dizajner</td>
      <td>Aktiv</td>
    </tr>
  </tbody>
</table>
`
  },

  // ==========================================
  // 9. FORMS & INPUTS
  // ==========================================
  forms: {
    title: {
      sq: "Formularët dhe fushat hyrëse",
      en: "Forms and Input Fields"
    },

    topics: {
      formElement: {
        sq: "<form> grupon kontrollet që dërgojnë të dhëna. Atributet action dhe method përcaktojnë destinacionin dhe metodën e kërkesës.",
        en: "<form> groups controls that submit data. The action and method attributes define the destination and request method."
      },

      getAndPost: {
        sq: "GET përdoret zakonisht për kërkime dhe marrje të të dhënave. POST përdoret për dërgimin e të dhënave që përpunohen nga serveri. POST nuk i bën automatikisht të dhënat konfidenciale.",
        en: "GET is commonly used for retrieving data and searches. POST submits data for server processing. POST does not automatically make data confidential."
      },

      inputTypes: {
        sq: "Llojet e zakonshme të input përfshijnë text, email, password, number, date, checkbox, radio, file dhe submit.",
        en: "Common input types include text, email, password, number, date, checkbox, radio, file, and submit."
      },

      labels: {
        sq: "Çdo fushë hyrëse duhet të ketë një etiketë të kuptueshme. Elementi <label> mund të lidhet me input përmes for dhe id.",
        en: "Each input should have an understandable label. The <label> element can be associated with an input using for and id."
      },

      nameAttribute: {
        sq: "Atributi name përcakton emrin me të cilin vlera e fushës përfshihet në të dhënat e formularit.",
        en: "The name attribute defines the key under which the field's value is included in form data."
      },

      validation: {
        sq: "Atributet required, minlength, maxlength, min, max, step dhe type mundësojnë validim bazë në shfletues. Validimi në server mbetet i nevojshëm.",
        en: "The required, minlength, maxlength, min, max, step, and type attributes provide basic browser validation. Server-side validation is still necessary."
      },

      fieldsetAndLegend: {
        sq: "<fieldset> grupon fusha të lidhura, ndërsa <legend> jep emrin e grupit.",
        en: "<fieldset> groups related fields, while <legend> names the group."
      },

      textareaAndSelect: {
        sq: "<textarea> përdoret për tekst me shumë rreshta. <select> krijon një listë zgjedhjeje me elemente <option>.",
        en: "<textarea> is used for multiline text. <select> creates a selection list using <option> elements."
      }
    },

    example: `
<form action="/contact" method="post">
  <div>
    <label for="full-name">Emri i plotë:</label>
    <input
      type="text"
      id="full-name"
      name="full_name"
      autocomplete="name"
      required
      minlength="2">
  </div>

  <div>
    <label for="email">Adresa e emailit:</label>
    <input
      type="email"
      id="email"
      name="email"
      autocomplete="email"
      required>
  </div>

  <fieldset>
    <legend>Preferenca e kontaktit</legend>

    <label>
      <input type="radio" name="contact_method" value="email" checked>
      Email
    </label>

    <label>
      <input type="radio" name="contact_method" value="phone">
      Telefon
    </label>
  </fieldset>

  <div>
    <label for="message">Mesazhi:</label>
    <textarea id="message" name="message" rows="5" required></textarea>
  </div>

  <button type="submit">Dërgo mesazhin</button>
</form>
`
  },

  // ==========================================
  // 10. SEMANTIC HTML
  // ==========================================
  semanticHTML: {
    title: {
      sq: "HTML semantik",
      en: "Semantic HTML"
    },

    topics: {
      semanticMeaning: {
        sq: "HTML semantik përdor elemente që përshkruajnë kuptimin dhe rolin e përmbajtjes, jo vetëm pamjen e saj.",
        en: "Semantic HTML uses elements that describe the meaning and role of content, not just its appearance."
      },

      header: {
        sq: "<header> përfaqëson hyrjen ose zonën e titullit për faqen apo një seksion.",
        en: "<header> represents introductory or heading content for a page or section."
      },

      nav: {
        sq: "<nav> grupon lidhjet kryesore të navigimit.",
        en: "<nav> groups major navigation links."
      },

      main: {
        sq: "<main> përmban përmbajtjen kryesore unike të dokumentit. Zakonisht përdoret një element kryesor <main> i dukshëm për dokument.",
        en: "<main> contains the document's primary unique content. Typically, one visible main element is used per document."
      },

      sectionAndArticle: {
        sq: "<section> grupon përmbajtje sipas një teme, ndërsa <article> përfaqëson përmbajtje të pavarur që mund të kuptohet veçmas.",
        en: "<section> groups content by topic, while <article> represents self-contained content that can stand independently."
      },

      aside: {
        sq: "<aside> përfaqëson përmbajtje plotësuese, si shënime anësore ose lidhje të lidhura me temën.",
        en: "<aside> represents complementary content, such as side notes or related links."
      },

      footer: {
        sq: "<footer> përmban informacion përmbyllës për faqen ose seksionin, si autorësia ose lidhje shtesë.",
        en: "<footer> contains closing information for a page or section, such as authorship or additional links."
      }
    },

    example: `
<header>
  <h1>XSUS AI</h1>

  <nav aria-label="Navigimi kryesor">
    <a href="#courses">Kurset</a>
    <a href="#about">Rreth nesh</a>
  </nav>
</header>

<main>
  <section id="courses">
    <h2>Kurset</h2>

    <article>
      <h3>HTML për fillestarë</h3>
      <p>Mëso si të krijosh dokumente të strukturuara.</p>
    </article>
  </section>

  <aside>
    <h2>Këshillë</h2>
    <p>Praktiko duke krijuar faqe të vogla.</p>
  </aside>
</main>

<footer>
  <p>&copy; XSUS AI</p>
</footer>
`
  },

  // ==========================================
  // 11. ACCESSIBILITY FUNDAMENTALS
  // ==========================================
  accessibility: {
    title: {
      sq: "Bazat e aksesueshmërisë në HTML",
      en: "HTML Accessibility Fundamentals"
    },

    topics: {
      meaningfulStructure: {
        sq: "Struktura semantike, titujt logjikë, listat dhe etiketat e formularëve e bëjnë përmbajtjen më të kuptueshme për përdoruesit dhe teknologjitë ndihmëse.",
        en: "Semantic structure, logical headings, lists, and form labels make content easier to understand for users and assistive technologies."
      },

      altText: {
        sq: "Imazhet informuese duhet të kenë tekst alternativ të përshtatshëm. Imazhet dekorative zakonisht përdorin alt bosh.",
        en: "Informative images should have appropriate alternative text. Decorative images generally use empty alt text."
      },

      keyboardAccess: {
        sq: "Lidhjet dhe kontrollet standarde duhet të jenë të përdorshme me tastierë. Mos hiq treguesin e fokusit pa ofruar një zëvendësim të qartë.",
        en: "Links and standard controls should be keyboard accessible. Do not remove focus indicators without providing a clear replacement."
      },

      aria: {
        sq: "ARIA shton informacione për teknologjitë ndihmëse kur semantika vendase HTML nuk mjafton. Prefero elementet vendase semantike kur ato e kryejnë funksionin.",
        en: "ARIA adds information for assistive technologies when native HTML semantics are insufficient. Prefer native semantic elements whenever they provide the required functionality."
      },

      langAttribute: {
        sq: "Atributi lang identifikon gjuhën e përmbajtjes dhe ndihmon lexuesit e ekranit në shqiptim.",
        en: "The lang attribute identifies content language and helps screen readers with pronunciation."
      },

      accessibleNames: {
        sq: "Kontrollet interaktive duhet të kenë emra të kuptueshëm dhe etiketa që shpjegojnë qëllimin e tyre.",
        en: "Interactive controls should have understandable accessible names and labels that explain their purpose."
      }
    },

    example: `
<html lang="sq">
<body>
  <a href="#content">Kalo te përmbajtja kryesore</a>

  <header>
    <h1>Udhëzuesi i aksesueshmërisë</h1>
  </header>

  <main id="content">
    <h2>Kontakto ekipin</h2>

    <form action="/contact" method="post">
      <label for="contact-email">Emaili yt:</label>
      <input
        id="contact-email"
        name="email"
        type="email"
        required>

      <button type="submit">Dërgo kërkesën</button>
    </form>
  </main>
</body>
</html>
`
  },

  // ==========================================
  // 12. HTML GLOBAL ATTRIBUTES
  // ==========================================
  globalAttributes: {
    title: {
      sq: "Atributet globale të HTML-it",
      en: "HTML Global Attributes"
    },

    topics: {
      hidden: {
        sq: "Atributi hidden tregon se elementi nuk duhet të paraqitet si përmbajtje normale e faqes.",
        en: "The hidden attribute indicates that an element should not be presented as normal page content."
      },

      tabindex: {
        sq: "tabindex kontrollon pjesëmarrjen dhe renditjen e elementit në navigimin me tastierë. Shmang vlerat pozitive që krijojnë renditje të vështirë për t'u ndjekur.",
        en: "tabindex controls an element's participation and order in keyboard navigation. Avoid positive values that create difficult navigation sequences."
      },

      dataAttributes: {
        sq: "Atributet data-* ruajnë të dhëna të personalizuara në elementet HTML, për shembull data-category='course'.",
        en: "data-* attributes store custom data on HTML elements, for example data-category='course'."
      },

      contenteditable: {
        sq: "contenteditable mundëson redaktimin e përmbajtjes nga përdoruesi në shfletues, por nuk e ruan automatikisht atë në server.",
        en: "contenteditable allows users to edit content in the browser, but does not automatically save it to a server."
      },

      draggable: {
        sq: "Atributi draggable kontrollon nëse një element mund të tërhiqet. Përvoja e plotë e tërheqjes mund të kërkojë logjikë shtesë.",
        en: "The draggable attribute controls whether an element can be dragged. A complete drag-and-drop experience may require additional logic."
      }
    },

    example: `
<article
  id="course-html"
  class="course-card"
  data-category="html"
  data-level="beginner">
  <h2>Kursi HTML</h2>
  <p>Hyrje në strukturën e faqeve web.</p>
</article>

<p hidden>Ky tekst është i fshehur.</p>

<p contenteditable="true">
  Mund ta redaktosh këtë tekst në shfletues.
</p>
`
  },

  // ==========================================
  // 13. HTML ENTITIES & SPECIAL CHARACTERS
  // ==========================================
  entities: {
    title: {
      sq: "Entitetet dhe karakteret speciale",
      en: "HTML Entities and Special Characters"
    },

    topics: {
      reservedCharacters: {
        sq: "Disa karaktere kanë kuptim të veçantë në HTML dhe duhet të përfaqësohen me entitete kur përdoren si tekst literal.",
        en: "Some characters have special meaning in HTML and must be represented with entities when used as literal text."
      },

      commonEntities: {
        sq: "&amp; paraqet &, &lt; paraqet <, &gt; paraqet >, &quot; paraqet thonjëzat e dyfishta dhe &nbsp; paraqet hapësirë të pandashme.",
        en: "&amp; represents &, &lt; represents <, &gt; represents >, &quot; represents a double quote, and &nbsp; represents a non-breaking space."
      },

      copyright: {
        sq: "&copy; paraqet simbolin e të drejtës së autorit dhe &reg; simbolin e markës së regjistruar.",
        en: "&copy; represents the copyright symbol and &reg; represents the registered trademark symbol."
      },

      unicode: {
        sq: "HTML mbështet karakteret Unicode. Deklarimi <meta charset='UTF-8'> ndihmon në interpretimin e saktë të karaktereve të gjuhëve të ndryshme.",
        en: "HTML supports Unicode characters. Declaring <meta charset='UTF-8'> helps ensure correct interpretation of characters from different languages."
      }
    },

    example: `
<p>Operatori A &amp; B</p>
<p>Shkruaj &lt;h1&gt; për të treguar një etiketë HTML si tekst.</p>
<p>&copy; 2026 XSUS AI</p>
<p>Gjuhë: Shqip, English, Français.</p>
`
  },

  // ==========================================
  // 14. HTML BEST PRACTICES
  // ==========================================
  bestPractices: {
    title: {
      sq: "Praktikat më të mira për HTML",
      en: "HTML Best Practices"
    },

    topics: {
      validMarkup: {
        sq: "Përdor elementet sipas specifikimit dhe mbyll siç duhet elementet që kërkojnë mbyllje. HTML i vlefshëm ndihmon në parashikueshmërinë e paraqitjes.",
        en: "Use elements according to the specification and close elements that require closing. Valid HTML improves rendering predictability."
      },

      semanticElements: {
        sq: "Prefero elementet semantike si <nav>, <main>, <article> dhe <button> në vend të elementeve të përgjithshme kur ka një element të përshtatshëm.",
        en: "Prefer semantic elements such as <nav>, <main>, <article>, and <button> over generic elements when a suitable element exists."
      },

      descriptiveLinks: {
        sq: "Përdor tekst lidhjeje që tregon destinacionin. Shmang frazat e paqarta si 'kliko këtu' kur nuk shpjegojnë kontekstin.",
        en: "Use link text that communicates the destination. Avoid vague phrases such as 'click here' when they do not explain the context."
      },

      formLabels: {
        sq: "Lidhi etiketat me fushat përkatëse dhe jep udhëzime të qarta për fushat e detyrueshme.",
        en: "Associate labels with their fields and provide clear instructions for required inputs."
      },

      progressiveEnhancement: {
        sq: "Ndërto një strukturë HTML të dobishme dhe kuptimplotë edhe përpara se të shtohen përmirësime të tjera.",
        en: "Build a useful and meaningful HTML structure before adding further enhancements."
      },

      validation: {
        sq: "Kontrollo dokumentet me mjete validimi HTML dhe testo me tastierë, ekrane të ndryshme dhe teknologji ndihmëse.",
        en: "Check documents with HTML validation tools and test with keyboards, different screens, and assistive technologies."
      }
    },

    example: `
<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kurset e XSUS AI</title>
  <meta
    name="description"
    content="Eksploro kurset hyrëse të teknologjisë.">
</head>
<body>
  <header>
    <h1>Kurset e XSUS AI</h1>
    <nav aria-label="Navigimi kryesor">
      <a href="#html-course">Kursi HTML</a>
    </nav>
  </header>

  <main>
    <article id="html-course">
      <h2>HTML për fillestarë</h2>
      <p>Mëso të krijosh dokumente web semantike.</p>
      <a href="/courses/html">Shiko përmbajtjen e kursit HTML</a>
    </article>
  </main>

  <footer>
    <p>&copy; 2026 XSUS AI</p>
  </footer>
</body>
</html>
`
  },

  // ==========================================
  // 15. HTML GLOSSARY
  // ==========================================
  glossary: [
    {
      term: "HTML",
      sq: "Gjuhë shënjimi që përcakton strukturën dhe kuptimin e përmbajtjes web.",
      en: "A markup language that defines the structure and meaning of web content."
    },
    {
      term: "Element",
      sq: "Njësi strukturore HTML e përbërë nga etiketa dhe, kur është e zbatueshme, përmbajtja e saj.",
      en: "An HTML structural unit consisting of tags and, where applicable, its content."
    },
    {
      term: "Attribute",
      sq: "Informacion shtesë i vendosur në etiketën e elementit.",
      en: "Additional information specified on an element's tag."
    },
    {
      term: "Semantic HTML",
      sq: "Përdorimi i elementeve që shprehin kuptimin dhe rolin e përmbajtjes.",
      en: "The use of elements that express the meaning and role of content."
    },
    {
      term: "Metadata",
      sq: "Informacion që përshkruan dokumentin dhe mënyrën si duhet interpretuar.",
      en: "Information describing a document and how it should be interpreted."
    },
    {
      term: "Accessibility",
      sq: "Praktika e bërjes së përmbajtjes dhe funksioneve të përdorshme për sa më shumë njerëz.",
      en: "The practice of making content and functionality usable by as many people as possible."
    },
    {
      term: "Alternative Text",
      sq: "Tekst që komunikon informacionin ose funksionin e një imazhi.",
      en: "Text that communicates an image's information or function."
    },
    {
      term: "Form",
      sq: "Grup kontrollesh që përdoret për mbledhjen dhe dërgimin e të dhënave të përdoruesit.",
      en: "A group of controls used to collect and submit user data."
    },
    {
      term: "Viewport",
      sq: "Zona e dukshme ku paraqitet faqja në shfletues.",
      en: "The visible area in which a page is displayed in the browser."
    },
    {
      term: "HTML Entity",
      sq: "Përfaqësim tekstual për një karakter të veçantë, si &amp; ose &lt;.",
      en: "A textual representation of a special character, such as &amp; or &lt;."
    }
  ]
};

// CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = htmlFundamentalsKnowledge;
}
