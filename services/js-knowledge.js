const javascriptMasterKnowledge = {
  // ==========================================
  // 1. BAZAT E JAVASCRIPT-IT / FUNDAMENTALS
  // ==========================================
  fundamentals: {
    title: {
      sq: "Bazat e JavaScript-it",
      en: "JavaScript Fundamentals"
    },
    topics: {
      introduction: {
        sq: "JavaScript është gjuhë programimi dinamike që përdoret për faqe interaktive, aplikacione web, serverë dhe platforma të tjera.",
        en: "JavaScript is a dynamic programming language used for interactive websites, web applications, servers, and other platforms."
      },
      variables: {
        sq: "Përdor let për variabla që mund të ndryshojnë dhe const për lidhje që nuk ricaktohen. var përdoret kryesisht në kod të vjetër.",
        en: "Use let for reassignable variables and const for bindings that are not reassigned. var is mainly found in legacy code."
      },
      dataTypes: {
        sq: "Llojet primitive janë string, number, bigint, boolean, undefined, symbol dhe null. Object përdoret për struktura të përbëra.",
        en: "Primitive types are string, number, bigint, boolean, undefined, symbol, and null. Object is used for compound structures."
      },
      typeConversion: {
        sq: "Konvertimi i tipit mund të jetë i qartë, si Number('12'), ose i nënkuptuar nga rregullat e JavaScript-it.",
        en: "Type conversion can be explicit, such as Number('12'), or implicit through JavaScript coercion rules."
      },
      equality: {
        sq: "Përdor === dhe !== për krahasim të rreptë që nuk kryen konvertim automatik të tipit.",
        en: "Use === and !== for strict comparison without automatic type coercion."
      }
    },
    example: `
const name = "Arta";
let age = 20;
age += 1;

console.log(name, age);
`
  },

  // ==========================================
  // 2. OPERATORËT DHE KUSHTET / OPERATORS
  // ==========================================
  operatorsAndConditions: {
    title: {
      sq: "Operatorët dhe kushtet",
      en: "Operators and Conditions"
    },
    topics: {
      arithmetic: {
        sq: "Operatorët aritmetikë janë +, -, *, /, %, ** dhe ++/--.",
        en: "Arithmetic operators include +, -, *, /, %, **, and ++/--."
      },
      comparison: {
        sq: "Operatorët e krahasimit përfshijnë ===, !==, >, <, >= dhe <=.",
        en: "Comparison operators include ===, !==, >, <, >=, and <=."
      },
      logical: {
        sq: "Operatorët logjikë janë &&, || dhe !.",
        en: "Logical operators are &&, ||, and !."
      },
      conditionals: {
        sq: "if, else if dhe else përdoren për degëzimin e programit. switch përdoret për disa raste të mundshme.",
        en: "if, else if, and else control branching. switch handles multiple possible cases."
      },
      nullishCoalescing: {
        sq: "Operatori ?? përdor vlerën rezervë vetëm kur vlera e majtë është null ose undefined.",
        en: "The ?? operator uses a fallback only when the left value is null or undefined."
      },
      optionalChaining: {
        sq: "Operatori ?. mundëson qasje të sigurt te prona e një vlere që mund të jetë null ose undefined.",
        en: "The ?. operator safely accesses a property when an intermediate value may be null or undefined."
      }
    },
    example: `
const user = { name: "Arta" };

if (user.name === "Arta") {
  console.log("Përshëndetje!");
}

console.log(user.profile?.email ?? "Nuk ka email");
`
  },

  // ==========================================
  // 3. CIKLET / LOOPS
  // ==========================================
  loops: {
    title: {
      sq: "Ciklet",
      en: "Loops"
    },
    topics: {
      forLoop: {
        sq: "Cikli for përsërit një bllok kodi sipas një kushti.",
        en: "The for loop repeats a block of code according to a condition."
      },
      whileLoop: {
        sq: "Cikli while vazhdon derisa kushti të bëhet false.",
        en: "The while loop continues while its condition is true."
      },
      doWhile: {
        sq: "Cikli do...while ekzekutohet të paktën një herë para kontrollit të kushtit.",
        en: "The do...while loop executes at least once before checking its condition."
      },
      forOf: {
        sq: "for...of kalon nëpër vlerat e një iterable, si array ose string.",
        en: "for...of iterates over the values of an iterable, such as an array or string."
      },
      forIn: {
        sq: "for...in kalon nëpër çelësat e numërueshëm të një objekti.",
        en: "for...in iterates over an object's enumerable property keys."
      },
      breakContinue: {
        sq: "break përfundon ciklin, ndërsa continue kalon te përsëritja tjetër.",
        en: "break terminates a loop, while continue skips to the next iteration."
      }
    },
    example: `
const fruits = ["Mollë", "Dardhë", "Banane"];

for (const fruit of fruits) {
  console.log(fruit);
}
`
  },

  // ==========================================
  // 4. FUNKSIONET / FUNCTIONS
  // ==========================================
  functions: {
    title: {
      sq: "Funksionet",
      en: "Functions"
    },
    topics: {
      declaration: {
        sq: "Funksioni është bllok kodi i ripërdorshëm që mund të marrë parametra dhe të kthejë rezultat.",
        en: "A function is a reusable block of code that can accept parameters and return a result."
      },
      arrowFunctions: {
        sq: "Funksionet shigjetë përdorin sintaksën => dhe nuk kanë this të tyre.",
        en: "Arrow functions use the => syntax and do not have their own this binding."
      },
      parameters: {
        sq: "Parametrat e parazgjedhur përdorin vlera rezervë kur argumenti mungon ose është undefined.",
        en: "Default parameters provide fallback values when an argument is missing or undefined."
      },
      restParameters: {
        sq: "Parametri ...args mbledh argumentet e mbetura në një array.",
        en: "The ...args rest parameter collects remaining arguments into an array."
      },
      callbacks: {
        sq: "Callback është funksion që i kalohet një funksioni tjetër për t'u thirrur më vonë.",
        en: "A callback is a function passed to another function to be called later."
      },
      closures: {
        sq: "Closure ruan qasjen te variablat e fushës ku funksioni është krijuar.",
        en: "A closure retains access to variables from the scope in which the function was created."
      },
      recursion: {
        sq: "Rekursioni ndodh kur një funksion thërret vetveten. Duhet një kusht përfundimi.",
        en: "Recursion occurs when a function calls itself. A termination condition is required."
      }
    },
    example: `
function greet(name = "mik") {
  return \`Përshëndetje, \${name}!\`;
}

const double = number => number * 2;

console.log(greet("Arta"));
console.log(double(5));
`
  },

  // ==========================================
  // 5. ARRAY DHE METODAT / ARRAYS
  // ==========================================
  arrays: {
    title: {
      sq: "Vargjet dhe metodat",
      en: "Arrays and Array Methods"
    },
    topics: {
      definition: {
        sq: "Array ruan një listë të renditur vlerash.",
        en: "An array stores an ordered list of values."
      },
      map: {
        sq: "map krijon një array të ri duke transformuar secilin element.",
        en: "map creates a new array by transforming each element."
      },
      filter: {
        sq: "filter krijon një array me elementet që plotësojnë kushtin.",
        en: "filter creates an array containing elements that satisfy a condition."
      },
      reduce: {
        sq: "reduce kombinon elementet e array-t në një rezultat të vetëm.",
        en: "reduce combines array elements into a single result."
      },
      find: {
        sq: "find kthen elementin e parë që plotëson kushtin ose undefined.",
        en: "find returns the first element satisfying the condition, or undefined."
      },
      someEvery: {
        sq: "some kontrollon nëse të paktën një element plotëson kushtin; every kontrollon nëse të gjithë e plotësojnë.",
        en: "some checks whether at least one element satisfies a condition; every checks whether all elements do."
      },
      mutation: {
        sq: "push, pop, shift, unshift dhe splice mund të ndryshojnë array-n origjinal. map dhe filter krijojnë array të ri.",
        en: "push, pop, shift, unshift, and splice can mutate the original array. map and filter create a new array."
      }
    },
    example: `
const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(n => n * 2);
const even = numbers.filter(n => n % 2 === 0);
const total = numbers.reduce((sum, n) => sum + n, 0);

console.log(doubled, even, total);
`
  },

  // ==========================================
  // 6. OBJEKTET / OBJECTS
  // ==========================================
  objects: {
    title: {
      sq: "Objektet",
      en: "Objects"
    },
    topics: {
      properties: {
        sq: "Objektet ruajnë të dhëna në formën çelës-vlerë.",
        en: "Objects store data as key-value pairs."
      },
      destructuring: {
        sq: "Destructuring nxjerr prona nga objektet ose elemente nga array-t.",
        en: "Destructuring extracts properties from objects or elements from arrays."
      },
      spread: {
        sq: "Spread (...) zgjeron pronat e një objekti ose elementet e një array.",
        en: "Spread (...) expands object properties or array elements."
      },
      shallowCopy: {
        sq: "Kopjimi me {...object} është kopje e cekët; objektet e brendshme mbeten referenca të përbashkëta.",
        en: "Copying with {...object} is shallow; nested objects remain shared references."
      },
      objectMethods: {
        sq: "Object.keys, Object.values dhe Object.entries nxjerrin çelësat, vlerat dhe çiftet çelës-vlerë.",
        en: "Object.keys, Object.values, and Object.entries return keys, values, and key-value pairs."
      }
    },
    example: `
const person = {
  name: "Arta",
  age: 25
};

const { name, age } = person;
const updatedPerson = { ...person, age: 26 };

console.log(name, age, updatedPerson);
`
  },

  // ==========================================
  // 7. STRING DHE NUMBER / STRINGS AND NUMBERS
  // ==========================================
  stringsAndNumbers: {
    title: {
      sq: "Teksti dhe numrat",
      en: "Strings and Numbers"
    },
    topics: {
      strings: {
        sq: "String-et janë të pandryshueshme. Metodat e zakonshme përfshijnë slice, includes, startsWith, endsWith, replace dhe split.",
        en: "Strings are immutable. Common methods include slice, includes, startsWith, endsWith, replace, and split."
      },
      templateLiterals: {
        sq: "Template literals përdorin backticks dhe ${} për interpolim.",
        en: "Template literals use backticks and ${} for interpolation."
      },
      numbers: {
        sq: "Number përfaqëson numrat e zakonshëm. Number.isNaN kontrollon NaN, ndërsa Number.isFinite kontrollon vlerat e fundme.",
        en: "Number represents ordinary numeric values. Number.isNaN checks NaN, while Number.isFinite checks finite values."
      },
      bigint: {
        sq: "BigInt përfaqëson numra të plotë shumë të mëdhenj dhe nuk mund të përzihet drejtpërdrejt me Number në aritmetikë.",
        en: "BigInt represents very large integers and cannot be mixed directly with Number in arithmetic."
      },
      math: {
        sq: "Objekti Math ofron funksione si Math.round, Math.floor, Math.ceil, Math.max, Math.min dhe Math.random.",
        en: "The Math object provides functions such as Math.round, Math.floor, Math.ceil, Math.max, Math.min, and Math.random."
      }
    }
  },

  // ==========================================
  // 8. SCOPE, HOISTING DHE THIS
  // ==========================================
  scopeAndThis: {
    title: {
      sq: "Scope, hoisting dhe this",
      en: "Scope, Hoisting, and this"
    },
    topics: {
      scope: {
        sq: "Scope përcakton ku është i arritshëm një identifikues. JavaScript ka scope global, funksional dhe bllokor.",
        en: "Scope determines where an identifier is accessible. JavaScript has global, function, and block scope."
      },
      hoisting: {
        sq: "Hoisting përshkruan mënyrën si trajtohen deklarimet gjatë përgatitjes së kodit. let dhe const kanë temporal dead zone para inicializimit.",
        en: "Hoisting describes how declarations are handled during code preparation. let and const have a temporal dead zone before initialization."
      },
      this: {
        sq: "Vlera e this varet nga mënyra si thirret funksioni. Funksionet shigjetë trashëgojnë this nga konteksti përreth.",
        en: "The value of this depends on how a function is called. Arrow functions inherit this from the surrounding context."
      },
      strictMode: {
        sq: "Strict mode zbulon disa gabime dhe ndryshon disa sjellje të JavaScript-it.",
        en: "Strict mode catches certain errors and changes some JavaScript behaviors."
      }
    }
  },

  // ==========================================
  // 9. ASINKRONIA / ASYNCHRONOUS JAVASCRIPT
  // ==========================================
  asynchronous: {
    title: {
      sq: "Programimi asinkron",
      en: "Asynchronous Programming"
    },
    topics: {
      eventLoop: {
        sq: "Event loop koordinon radhën e detyrave dhe microtask-eve me ekzekutimin e JavaScript-it.",
        en: "The event loop coordinates task and microtask queues with JavaScript execution."
      },
      callbacks: {
        sq: "Callback përdoret për të njoftuar ose vazhduar punën pasi të ndodhë një ngjarje.",
        en: "A callback is used to notify or continue work after an event occurs."
      },
      promises: {
        sq: "Promise përfaqëson një rezultat të ardhshëm dhe mund të jetë pending, fulfilled ose rejected.",
        en: "A Promise represents a future result and can be pending, fulfilled, or rejected."
      },
      asyncAwait: {
        sq: "async/await e bën kodin e bazuar në Promise më të lexueshëm. Përdor try/catch për gabimet.",
        en: "async/await makes Promise-based code easier to read. Use try/catch for errors."
      },
      promiseAll: {
        sq: "Promise.all pret që të gjitha Promise-t të përmbushen ose refuzohet kur njëra dështon.",
        en: "Promise.all waits for all promises to fulfill or rejects when one rejects."
      },
      promiseAllSettled: {
        sq: "Promise.allSettled pret përfundimin e të gjitha Promise-ve, pavarësisht suksesit ose dështimit.",
        en: "Promise.allSettled waits for every promise to settle, regardless of success or failure."
      },
      fetch: {
        sq: "fetch bën kërkesa rrjeti. Kontrollo response.ok, sepse përgjigjet HTTP si 404 nuk e refuzojnë vetë Promise-n.",
        en: "fetch makes network requests. Check response.ok because HTTP responses such as 404 do not automatically reject the promise."
      }
    },
    example: `
async function getData(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(\`HTTP error: \${response.status}\`);
  }

  return response.json();
}
`
  },

  // ==========================================
  // 10. DOM DHE SHFLETUESI / DOM AND BROWSER
  // ==========================================
  dom: {
    title: {
      sq: "DOM dhe API-të e shfletuesit",
      en: "DOM and Browser APIs"
    },
    topics: {
      selectingElements: {
        sq: "querySelector gjen elementin e parë që përputhet me një selektor CSS; querySelectorAll kthen një NodeList.",
        en: "querySelector finds the first element matching a CSS selector; querySelectorAll returns a NodeList."
      },
      events: {
        sq: "addEventListener lidh funksione me ngjarje si click, input, submit dhe keydown.",
        en: "addEventListener attaches functions to events such as click, input, submit, and keydown."
      },
      textContent: {
        sq: "textContent vendos tekst të zakonshëm. Shmang innerHTML me përmbajtje të pabesuar për të reduktuar rrezikun XSS.",
        en: "textContent sets plain text. Avoid innerHTML with untrusted content to reduce XSS risk."
      },
      forms: {
        sq: "Formularët mund të validohen në shfletues, por serveri duhet t'i validojë të dhënat përsëri.",
        en: "Forms can be validated in the browser, but the server must validate submitted data again."
      },
      storage: {
        sq: "localStorage ruan vargje teksti në shfletues; sessionStorage kufizohet te sesioni i skedës. Mos ruaj sekrete të ndjeshme aty.",
        en: "localStorage stores strings in the browser; sessionStorage is scoped to the tab session. Do not store sensitive secrets there."
      }
    },
    example: `
const button = document.querySelector("#save");

button?.addEventListener("click", () => {
  const status = document.querySelector("#status");
  if (status) status.textContent = "U ruajt me sukses";
});
`
  },

  // ==========================================
  // 11. MODUlet / MODULES
  // ==========================================
  modules: {
    title: {
      sq: "Modulet",
      en: "Modules"
    },
    topics: {
      exportImport: {
        sq: "ES modules përdorin export për të publikuar vlera dhe import për t'i përdorur në skedarë të tjerë.",
        en: "ES modules use export to expose values and import to use them in other files."
      },
      defaultExport: {
        sq: "Një modul mund të ketë një default export dhe disa named exports.",
        en: "A module can have one default export and multiple named exports."
      },
      commonJS: {
        sq: "CommonJS përdor require dhe module.exports dhe është i zakonshëm në projekte ekzistuese Node.js.",
        en: "CommonJS uses require and module.exports and is common in existing Node.js projects."
      },
      packageJson: {
        sq: "package.json përshkruan projektin, skriptet, varësitë dhe konfigurimin e paketave.",
        en: "package.json describes the project, scripts, dependencies, and package configuration."
      }
    },
    example: `
// math.js
export const add = (a, b) => a + b;

// app.js
import { add } from "./math.js";
console.log(add(2, 3));
`
  },

  // ==========================================
  // 12. KLASAT DHE PROTOTIPET / CLASSES
  // ==========================================
  objectOrientedProgramming: {
    title: {
      sq: "Klasat dhe prototipet",
      en: "Classes and Prototypes"
    },
    topics: {
      prototypes: {
        sq: "JavaScript përdor zinxhirin e prototipeve për trashëgimi të sjelljes.",
        en: "JavaScript uses the prototype chain for behavioral inheritance."
      },
      classes: {
        sq: "class ofron sintaksë për konstruktorë dhe metoda; mekanizmi bazë i trashëgimisë mbështetet te prototipet.",
        en: "class provides syntax for constructors and methods; its inheritance mechanism is based on prototypes."
      },
      inheritance: {
        sq: "extends krijon një klasë të prejardhur dhe super thërret konstruktorin ose metodat e klasës bazë.",
        en: "extends creates a derived class and super calls the base class constructor or methods."
      },
      privateFields: {
        sq: "Fushat e klasës me prefiks # janë private dhe nuk aksesohen drejtpërdrejt nga jashtë klasës.",
        en: "Class fields prefixed with # are private and cannot be accessed directly from outside the class."
      }
    },
    example: `
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return \`\${this.name} bën një tingull\`;
  }
}

class Dog extends Animal {
  speak() {
    return \`\${this.name} leh\`;
  }
}
`
  },

  // ==========================================
  // 13. PROGRAMIMI FUNKSIONAL / FUNCTIONAL
  // ==========================================
  functionalProgramming: {
    title: {
      sq: "Programimi funksional",
      en: "Functional Programming"
    },
    topics: {
      pureFunctions: {
        sq: "Funksioni i pastër kthen të njëjtin rezultat për të njëjtat hyrje dhe nuk ka efekte anësore.",
        en: "A pure function returns the same result for the same inputs and has no side effects."
      },
      immutability: {
        sq: "Immutability do të thotë të mos ndryshosh drejtpërdrejt të dhënat ekzistuese, por të krijosh vlera të reja.",
        en: "Immutability means avoiding direct changes to existing data and creating new values instead."
      },
      higherOrderFunctions: {
        sq: "Funksionet e rendit të lartë marrin funksione si argumente ose kthejnë funksione.",
        en: "Higher-order functions accept functions as arguments or return functions."
      },
      composition: {
        sq: "Kompozimi kombinon funksione të vogla për të krijuar sjellje më të mëdha dhe të ripërdorshme.",
        en: "Composition combines small functions to create larger reusable behavior."
      }
    }
  },

  // ==========================================
  // 14. GABIMET DHE DEBUGGING
  // ==========================================
  debugging: {
    title: {
      sq: "Gabimet dhe korrigjimi",
      en: "Errors and Debugging"
    },
    topics: {
      tryCatch: {
        sq: "try/catch trajton gabimet që ndodhin gjatë ekzekutimit; finally përdoret për pastrim.",
        en: "try/catch handles runtime errors; finally is used for cleanup."
      },
      errorTypes: {
        sq: "Error dhe nënllojet e tij, si TypeError, ReferenceError dhe SyntaxError, ndihmojnë në klasifikimin e problemeve.",
        en: "Error and subclasses such as TypeError, ReferenceError, and SyntaxError help classify problems."
      },
      debugger: {
        sq: "Përdor breakpoint-e dhe debugger për të inspektuar variablat dhe rrjedhën e ekzekutimit.",
        en: "Use breakpoints and debugger to inspect variables and execution flow."
      },
      customErrors: {
        sq: "Krijo klasa që trashëgojnë Error për gabime specifike të aplikacionit.",
        en: "Create classes extending Error for application-specific errors."
      }
    },
    example: `
try {
  JSON.parse("{invalid}");
} catch (error) {
  console.error("Nuk u analizua JSON:", error.message);
}
`
  },

  // ==========================================
  // 15. SIGURIA / SECURITY
  // ==========================================
  security: {
    title: {
      sq: "Siguria në JavaScript",
      en: "JavaScript Security"
    },
    topics: {
      xss: {
        sq: "Shmang futjen e përmbajtjes së pabesuar me innerHTML. Përdor textContent ose një sanitizues të besueshëm kur HTML është i domosdoshëm.",
        en: "Avoid inserting untrusted content with innerHTML. Use textContent or a trusted sanitizer when HTML is required."
      },
      secrets: {
        sq: "Mos vendos sekrete serveri, çelësa privatë ose token-a administrativë në kodin që dërgohet te shfletuesi.",
        en: "Never put server secrets, private keys, or administrative tokens in code shipped to the browser."
      },
      validation: {
        sq: "Valido hyrjet në server edhe kur ato janë kontrolluar në klient.",
        en: "Validate inputs on the server even when they have been checked on the client."
      },
      dependencies: {
        sq: "Përdor paketa të besueshme, kontrollo dobësitë dhe përditëso varësitë.",
        en: "Use trusted packages, audit vulnerabilities, and update dependencies."
      },
      authentication: {
        sq: "Autentikimi dhe autorizimi duhet të zbatohen në server, jo vetëm në ndërfaqen e përdoruesit.",
        en: "Authentication and authorization must be enforced on the server, not only in the user interface."
      }
    }
  },

  // ==========================================
  // 16. PERFORMANCA / PERFORMANCE
  // ==========================================
  performance: {
    title: {
      sq: "Performanca dhe optimizimi",
      en: "Performance and Optimization"
    },
    topics: {
      profiling: {
        sq: "Mat performancën me profiler para se të optimizosh.",
        en: "Measure performance with a profiler before optimizing."
      },
      debounce: {
        sq: "Debounce pret derisa ngjarjet të qetësohen para ekzekutimit të funksionit.",
        en: "Debounce waits until events settle before running a function."
      },
      throttle: {
        sq: "Throttle kufizon sa shpesh mund të ekzekutohet një funksion.",
        en: "Throttle limits how often a function can execute."
      },
      memory: {
        sq: "Hiq listener-at e panevojshëm dhe shmang mbajtjen e referencave që nuk duhen.",
        en: "Remove unnecessary listeners and avoid retaining references that are no longer needed."
      },
      lazyLoading: {
        sq: "Ngarkimi dembel shtyn ngarkimin e burimeve derisa ato të nevojiten.",
        en: "Lazy loading defers loading resources until they are needed."
      }
    }
  },

  // ==========================================
  // 17. TESTIMI / TESTING
  // ==========================================
  testing: {
    title: {
      sq: "Testimi i JavaScript-it",
      en: "JavaScript Testing"
    },
    topics: {
      unitTests: {
        sq: "Testet unitare kontrollojnë funksione ose njësi të vogla në izolim.",
        en: "Unit tests check small functions or units in isolation."
      },
      integrationTests: {
        sq: "Testet e integrimit kontrollojnë bashkëveprimin ndërmjet disa komponentëve.",
        en: "Integration tests verify interactions between multiple components."
      },
      endToEnd: {
        sq: "Testet end-to-end simulojnë rrjedha të përdoruesit në aplikacion.",
        en: "End-to-end tests simulate user flows through an application."
      },
      frameworks: {
        sq: "Jest, Vitest dhe Mocha janë mjete testimi; Playwright dhe Cypress përdoren shpesh për testim të shfletuesit.",
        en: "Jest, Vitest, and Mocha are testing tools; Playwright and Cypress are often used for browser testing."
      }
    }
  },

  // ==========================================
  // 18. NODE.JS / SERVER-SIDE JAVASCRIPT
  // ==========================================
  nodeJs: {
    title: {
      sq: "Node.js dhe JavaScript në server",
      en: "Node.js and Server-Side JavaScript"
    },
    note: {
      sq: "Node.js është mjedis ekzekutimi për JavaScript, jo gjuhë e veçantë programimi.",
      en: "Node.js is a JavaScript runtime, not a separate programming language."
    },
    topics: {
      runtime: {
        sq: "Node.js lejon ekzekutimin e JavaScript-it jashtë shfletuesit.",
        en: "Node.js allows JavaScript to run outside the browser."
      },
      fileSystem: {
        sq: "Moduli node:fs ofron funksione për leximin dhe shkrimin e skedarëve.",
        en: "The node:fs module provides functions for reading and writing files."
      },
      http: {
        sq: "Node.js mund të krijojë serverë HTTP dhe API.",
        en: "Node.js can create HTTP servers and APIs."
      },
      npm: {
        sq: "npm menaxhon paketat, varësitë dhe skriptet e projektit.",
        en: "npm manages packages, dependencies, and project scripts."
      },
      environmentVariables: {
        sq: "Variablat e mjedisit ruajnë konfigurimin; sekretet nuk duhen ekspozuar në log-e ose përgjigje publike.",
        en: "Environment variables store configuration; secrets must not be exposed in logs or public responses."
      }
    },
    example: `
// Node.js me ES modules
import { readFile } from "node:fs/promises";

const content = await readFile("./notes.txt", "utf8");
console.log(content);
`
  },

  // ==========================================
  // 19. FRAMEWORKS DHE LIBRARIES
  // ==========================================
  ecosystem: {
    title: {
      sq: "Ekosistemi JavaScript",
      en: "JavaScript Ecosystem"
    },
    note: {
      sq: "Framework-et dhe bibliotekat janë mjete të ekosistemit, jo pjesë e vetë sintaksës së JavaScript-it.",
      en: "Frameworks and libraries are ecosystem tools, not part of JavaScript language syntax itself."
    },
    topics: {
      react: {
        sq: "React është bibliotekë për ndërtimin e ndërfaqeve të përdoruesit me komponentë.",
        en: "React is a library for building component-based user interfaces."
      },
      vue: {
        sq: "Vue është framework progresiv për ndërtimin e ndërfaqeve web.",
        en: "Vue is a progressive framework for building web interfaces."
      },
      angular: {
        sq: "Angular është framework web me mjete të integruara për aplikacione të strukturuara.",
        en: "Angular is a web framework with integrated tools for structured applications."
      },
      express: {
        sq: "Express është framework minimal për krijimin e aplikacioneve web dhe API-ve në Node.js.",
        en: "Express is a minimal framework for building web apps and APIs on Node.js."
      },
      vite: {
        sq: "Vite ofron server zhvillimi dhe proces ndërtimi për aplikacione moderne web.",
        en: "Vite provides a development server and build process for modern web applications."
      },
      typescript: {
        sq: "TypeScript shton kontroll statik të tipeve mbi JavaScript-in dhe përpilohet në JavaScript.",
        en: "TypeScript adds static type checking on top of JavaScript and compiles to JavaScript."
      }
    }
  },

  // ==========================================
  // 20. FJALOR / GLOSSARY
  // ==========================================
  glossary: [
    {
      term: "Variable",
      sq: "Emër që lidhet me një vlerë.",
      en: "A name bound to a value."
    },
    {
      term: "Function",
      sq: "Bllok kodi i ripërdorshëm që mund të marrë hyrje dhe të kthejë rezultat.",
      en: "Reusable code that can accept inputs and return a result."
    },
    {
      term: "Array",
      sq: "Koleksion i renditur elementesh.",
      en: "An ordered collection of elements."
    },
    {
      term: "Object",
      sq: "Koleksion pronash çelës-vlerë.",
      en: "A collection of key-value properties."
    },
    {
      term: "Promise",
      sq: "Objekt që përfaqëson përfundimin ose dështimin e një operacioni asinkron.",
      en: "An object representing eventual completion or failure of an asynchronous operation."
    },
    {
      term: "Closure",
      sq: "Funksion që ruan qasje te scope-i ku është krijuar.",
      en: "A function that retains access to the scope where it was created."
    },
    {
      term: "DOM",
      sq: "Modeli objektor i dokumentit në shfletues.",
      en: "The browser's object model of a document."
    },
    {
      term: "API",
      sq: "Ndërfaqe që lejon komponentët softuerikë të komunikojnë.",
      en: "An interface that allows software components to communicate."
    },
    {
      term: "Runtime",
      sq: "Mjedisi ku ekzekutohet programi.",
      en: "The environment in which a program executes."
    },
    {
      term: "Module",
      sq: "Njësi kodi me ndërfaqe import/export.",
      en: "A code unit with an import/export interface."
    },
    {
      term: "Event loop",
      sq: "Mekanizëm që koordinon detyrat dhe vazhdimin e punës asinkrone.",
      en: "A mechanism coordinating tasks and asynchronous continuation."
    },
    {
      term: "Promise rejection",
      sq: "Gjendje kur një Promise përfundon me dështim.",
      en: "A state in which a Promise completes unsuccessfully."
    }
  ]
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = javascriptMasterKnowledge;
}
