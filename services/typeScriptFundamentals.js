// ============================================================================
// XSUS AI - TYPESCRIPT FUNDAMENTALS & TYPE SYSTEM MASTER KNOWLEDGE BASE
// Version: 2.0.0 (Extended Bilingual Structured Engine)
// ============================================================================

export const typeScriptFundamentalsKnowledge = {
  id: "typescript-fundamentals",
  title: "TypeScript Fundamentals & Type System Master Knowledge Base",
  title_sq: "Njohuritë Themelore të TypeScript dhe Sistemi i Tipave",
  description:
    "A comprehensive bilingual knowledge base covering TypeScript primitives, object types, functions, unions, generics, narrowing, utility types, advanced type programming, configuration, and best practices.",
  description_sq:
    "Një bazë gjithëpërfshirëse dygjuhëshe që mbulon tipat primitive, objektet, funksionet, union types, generics, type narrowing, utility types, programimin e avancuar me tipe, konfigurimin dhe praktikat më të mira.",
  version: "2.0.0",
  language: ["sq", "en"],

  sections: [
    // =====================================================
    // 1. BASIC TYPES
    // =====================================================
    {
      id: "basic-types",
      title: "Basic Primitive & Core Types",
      title_sq: "Tipat Bazë Primitive dhe Kryesorë",

      content_sq: `
TypeScript shton një sistem tipizimi statik mbi JavaScript. Kontrolli i tipeve kryhet kryesisht gjatë zhvillimit dhe kompilimit, jo si validim automatik i të dhënave në runtime.

Tipat primitive:
- string: Tekst.
- number: Numra integer dhe floating-point.
- boolean: true ose false.
- null: Mungesë e qëllimshme e një vlere.
- undefined: Vlerë e papërcaktuar.
- symbol: Identifikues unik.
- bigint: Numra të mëdhenj integer.

Tipa të veçantë:
- any: Dobëson kontrollin statik të tipave.
- unknown: Pranon çdo vlerë, por kërkon kontroll përpara përdorimit.
- void: Përdoret zakonisht për funksione pa vlerë kthimi domethënëse.
- never: Përfaqëson vlera që nuk ndodhin.
- object: Përfaqëson vlera që nuk janë primitive.
- {}: Përfaqëson vlera jo-nullish në konfigurimet standarde moderne; nuk do të thotë objekt bosh.
      `,

      content_en: `
TypeScript adds static type checking to JavaScript. Types help detect incompatible operations during development and compilation, but they do not automatically validate external runtime data.

Primitive types include string, number, boolean, null, undefined, symbol, and bigint. Special types include any, unknown, void, never, and object.
      `,

      example: `
const username: string = "Xhevahir";
const age: number = 30;
const isActive: boolean = true;

const largeNumber: bigint = 9007199254740993n;
const uniqueKey: symbol = Symbol("id");

let externalValue: unknown = "Hello";

if (typeof externalValue === "string") {
  console.log(externalValue.toUpperCase());
}

function logMessage(message: string): void {
  console.log(message);
}

function fail(message: string): never {
  throw new Error(message);
}
`,

      bestPractices: [
        {
          sq: "Prefero unknown në vend të any kur nuk e njeh tipin.",
          en: "Prefer unknown over any when the type is not known."
        },
        {
          sq: "Përdor tipizimin e inferuar kur tipi është i qartë.",
          en: "Use inferred types when the type is obvious."
        },
        {
          sq: "Kujto se deklarimet TypeScript nuk zëvendësojnë validimin në runtime.",
          en: "Remember that TypeScript declarations do not replace runtime validation."
        }
      ]
    },

    // =====================================================
    // 2. TYPE INFERENCE & ANNOTATIONS
    // =====================================================
    {
      id: "type-inference",
      title: "Type Inference and Annotations",
      title_sq: "Inferimi dhe Deklarimi i Tipave",

      content_sq: `
Type inference është aftësia e TypeScript për të përcaktuar tipin nga vlera fillestare, parametrat, konteksti ose rezultati i një shprehjeje.

Type annotation është deklarimi i qartë i tipit duke përdorur sintaksën : Type.

Inferimi redukton kodin e panevojshëm, ndërsa anotimet janë të dobishme në kufijtë e API-ve, parametrat e funksioneve dhe strukturat komplekse.
      `,

      content_en: `
Type inference allows TypeScript to determine types from initial values, expressions, function returns, and contextual information. Annotations explicitly declare a type.
      `,

      example: `
const message = "Hello";
// Inferred as string

let counter: number = 0;

function add(a: number, b: number) {
  return a + b;
}
// Return type inferred as number

const names = ["Ana", "Beni"];
names.push("Drita");

// Contextual typing
names.forEach((name) => {
  console.log(name.toUpperCase());
});
`,

      bestPractices: [
        {
          sq: "Përdor anotime për kontrata publike dhe parametra funksionesh.",
          en: "Use annotations for public contracts and function parameters."
        },
        {
          sq: "Mos e përsërit tipin pa nevojë kur inferimi është i saktë.",
          en: "Avoid redundant annotations when inference is reliable."
        }
      ]
    },

    // =====================================================
    // 3. INTERFACES VS TYPE ALIASES
    // =====================================================
    {
      id: "interfaces-vs-types",
      title: "Interfaces vs Type Aliases",
      title_sq: "Interfaces kundrejt Type Aliases",

      content_sq: `
Interface dhe type alias mund të përshkruajnë struktura objektesh.

Interface:
- Përdoret shpesh për kontrata objektesh.
- Mund të zgjerohet me extends.
- Mbështet declaration merging.
- Mund të implementohet nga klasa.

Type alias:
- Mund të përfaqësojë objekte, primitive, union, tuple dhe funksione.
- Mund të kombinohet me intersection types.
- Nuk mbështet declaration merging.

Nuk ekziston një rregull absolut që njërin ta përdorësh gjithmonë mbi tjetrin.
      `,

      content_en: `
Interfaces and type aliases both describe object shapes. Interfaces support declaration merging and extension. Type aliases can represent unions, tuples, primitives, and other type expressions.
      `,

      example: `
interface User {
  id: number;
  name: string;
  email?: string;
}

interface AdminUser extends User {
  role: "admin" | "superadmin";
}

type Coordinates = {
  x: number;
  y: number;
};

type Identifier = string | number;

type Employee = {
  companyId: number;
} & User;

const admin: AdminUser = {
  id: 1,
  name: "Arta",
  role: "admin"
};
`,

      bestPractices: [
        {
          sq: "Zgjidh formën që e bën kontratën më të qartë për ekipin.",
          en: "Choose the form that makes the contract clearest to the team."
        }
      ]
    },

    // =====================================================
    // 4. UNION, INTERSECTION & LITERAL TYPES
    // =====================================================
    {
      id: "unions-intersections-literals",
      title: "Union, Intersection, and Literal Types",
      title_sq: "Union, Intersection dhe Literal Types",

      content_sq: `
Union (|) lejon një vlerë të përputhet me njërin prej disa tipeve.

Intersection (&) kombinon kërkesat e disa tipeve.

Literal types kufizojnë vlerën te një literal i caktuar, si "success", 200 ose true.

Këto tipe janë veçanërisht të dobishme për gjendjet e aplikacionit dhe API-të.
      `,

      content_en: `
Union types allow one of several types. Intersection types combine requirements. Literal types restrict values to exact strings, numbers, or booleans.
      `,

      example: `
type RequestStatus = "idle" | "loading" | "success" | "error";

type Identifier = string | number;

type Person = {
  name: string;
};

type Employee = {
  employeeId: number;
};

type CorporateUser = Person & Employee;

const worker: CorporateUser = {
  name: "Alban",
  employeeId: 1024
};

const status: RequestStatus = "success";
`,

      bestPractices: [
        {
          sq: "Prefero union types të kufizuara në vend të string për gjendje të njohura.",
          en: "Prefer literal unions over string for known states."
        }
      ]
    },

    // =====================================================
    // 5. ARRAYS, TUPLES & ENUMS
    // =====================================================
    {
      id: "arrays-tuples-enums",
      title: "Arrays, Tuples, and Enums",
      title_sq: "Vargje, Tuples dhe Enums",

      content_sq: `
Array<T> ose T[] përfaqëson një koleksion elementesh të tipit T.

Tuple përshkruan një grup me pozicione dhe tipe të caktuara.

Enum krijon një grup vlerash të emërtuara. Për shumë raste moderne, union types me string literals janë alternativë më e thjeshtë.
      `,

      content_en: `
Arrays represent collections of values. Tuples define fixed positional structures. Enums provide named constants, although literal unions are often a simpler alternative.
      `,

      example: `
const scores: number[] = [80, 92, 100];

const userTuple: [string, number] = ["Arta", 25];

type Point = readonly [x: number, y: number];

const point: Point = [10, 20];

type Direction = "north" | "south" | "east" | "west";

enum NumericStatus {
  Pending,
  Approved,
  Rejected
}

const direction: Direction = "north";
const approval = NumericStatus.Approved;
`,

      bestPractices: [
        {
          sq: "Përdor tuple kur pozicioni ka kuptim semantik të përcaktuar.",
          en: "Use tuples when each position has a defined semantic meaning."
        },
        {
          sq: "Përdor union literals për gjendje të thjeshta dhe të serializueshme.",
          en: "Use literal unions for simple, serializable states."
        }
      ]
    },

    // =====================================================
    // 6. OBJECT TYPES & PROPERTY MODIFIERS
    // =====================================================
    {
      id: "object-types",
      title: "Object Types and Property Modifiers",
      title_sq: "Tipat e Objekteve dhe Modifikuesit e Vetive",

      content_sq: `
Tipat e objekteve përshkruajnë vetitë dhe tipat e tyre.

Modifikuesit e zakonshëm:
- ?: Prona është opsionale.
- readonly: Prona nuk mund të caktohet përsëri përmes asaj reference.
- [key: string]: T: Index signature për çelësa dinamikë.

readonly nuk garanton imutabilitet të thellë dhe nuk e ngrin objektin në runtime.
      `,

      content_en: `
Object types describe properties and their types. Optional and readonly modifiers control assignment behavior. Index signatures describe dynamically named properties.
      `,

      example: `
interface Profile {
  readonly id: string;
  name: string;
  nickname?: string;
}

interface NumberDictionary {
  [key: string]: number;
}

const profile: Profile = {
  id: "usr_1",
  name: "Drita"
};

profile.name = "Drita K.";
// profile.id = "usr_2"; // Error

const metrics: NumberDictionary = {
  visits: 120,
  conversions: 8
};
`,

      bestPractices: [
        {
          sq: "Përdor readonly për të komunikuar pronësinë dhe kufizimet e caktimit.",
          en: "Use readonly to communicate assignment constraints."
        }
      ]
    },

    // =====================================================
    // 7. FUNCTION TYPES
    // =====================================================
    {
      id: "function-types",
      title: "Function Types and Overloads",
      title_sq: "Tipat e Funksioneve dhe Overloads",

      content_sq: `
Funksionet mund të tipizojnë parametrat, vlerën e kthimit, parametrat opsionalë, parametrat rest dhe callback-et.

Overloads lejojnë deklarimin e disa formave publike të një funksioni, ndërsa implementimi duhet t'i mbështesë të gjitha.

Parametrat opsionalë shënohen me ?, ndërsa vlerat e parazgjedhura mund të caktohen drejtpërdrejt në parametra.
      `,

      content_en: `
Function types describe parameters and return values. Optional and rest parameters support flexible signatures. Overloads expose multiple call signatures for one implementation.
      `,

      example: `
type Formatter = (value: number) => string;

const formatCurrency: Formatter = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);

function greet(name: string, prefix = "Hello"): string {
  return prefix + ", " + name;
}

function sumAll(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function normalize(value: string): string;
function normalize(value: number): string;
function normalize(value: string | number): string {
  return String(value).trim();
}
`,

      bestPractices: [
        {
          sq: "Përdor overloads vetëm kur format e thirrjes ndryshojnë realisht.",
          en: "Use overloads when call signatures meaningfully differ."
        }
      ]
    },

    // =====================================================
    // 8. GENERICS
    // =====================================================
    {
      id: "generics",
      title: "Generics, Constraints, and Inference",
      title_sq: "Generics, Kufizimet dhe Inferimi",

      content_sq: `
Generics mundësojnë funksione dhe struktura të ripërdorshme që ruajnë lidhjen mes tipeve hyrëse dhe dalëse.

T extends Constraint kufizon tipat e lejuar. K extends keyof T siguron që K të jetë çelës i T.

Generics nuk janë e njëjta gjë me any: ata ruajnë informacionin e tipit.
      `,

      content_en: `
Generics preserve relationships between input and output types. Constraints restrict allowed type arguments while maintaining type safety.
      `,

      example: `
function identity<T>(value: T): T {
  return value;
}

const count = identity(42);
const label = identity("XSUS AI");

interface ApiResponse<TData> {
  data: TData;
  status: number;
}

type User = {
  id: string;
  name: string;
};

const response: ApiResponse<User> = {
  status: 200,
  data: {
    id: "u1",
    name: "Arta"
  }
};

function getProperty<T, K extends keyof T>(
  object: T,
  key: K
): T[K] {
  return object[key];
}

const userName = getProperty(
  { id: 1, name: "Arta" },
  "name"
);
`,

      bestPractices: [
        {
          sq: "Përdor emra kuptimplotë për parametrat generic kur struktura është komplekse.",
          en: "Use descriptive generic parameter names for complex abstractions."
        }
      ]
    },

    // =====================================================
    // 9. UTILITY TYPES
    // =====================================================
    {
      id: "utility-types",
      title: "Built-in Utility Types",
      title_sq: "Utility Types të Integruara",

      content_sq: `
Utility types transformojnë tipe ekzistuese.

- Partial<T>: I bën vetitë opsionale.
- Required<T>: I bën vetitë të detyrueshme.
- Readonly<T>: I shënon vetitë si readonly.
- Pick<T, K>: Përzgjedh veti.
- Omit<T, K>: Heq veti.
- Record<K, T>: Krijon një hartë çelës-vlerë.
- Exclude<T, U>: Heq nga T anëtarët që përputhen me U.
- Extract<T, U>: Nxjerr anëtarët e T që përputhen me U.
- NonNullable<T>: Heq null dhe undefined.
- ReturnType<T>: Nxjerr tipin e kthimit të funksionit.
- Parameters<T>: Nxjerr tuple-n e parametrave.
- Awaited<T>: Nxjerr tipin e zgjidhur nga Promise.
      `,

      content_en: `
Utility types transform existing types into useful variants, including partial objects, selected properties, records, filtered unions, function parameters, and return types.
      `,

      example: `
interface Article {
  id: string;
  title: string;
  content: string;
  author: string;
  published?: boolean;
}

type ArticleUpdate = Partial<Article>;
type ArticleSummary = Pick<Article, "id" | "title">;
type ArticleContent = Omit<Article, "author">;
type CompleteArticle = Required<Article>;
type ImmutableArticle = Readonly<Article>;

type Role = "admin" | "editor" | "viewer";
type RolePermissions = Record<Role, string[]>;

type PublicRole = Exclude<Role, "admin">;
type AdminRole = Extract<Role, "admin">;

type PresentValue = NonNullable<string | null | undefined>;

async function loadCount() {
  return 10;
}

type LoadedCount = Awaited<ReturnType<typeof loadCount>>;
`,

      bestPractices: [
        {
          sq: "Krijo DTO-të nga tipe bazë për të shmangur përsëritjen.",
          en: "Derive DTOs from base types to reduce duplication."
        }
      ]
    },

    // =====================================================
    // 10. TYPE GUARDS & NARROWING
    // =====================================================
    {
      id: "type-guards",
      title: "Type Guards and Type Narrowing",
      title_sq: "Type Guards dhe Ngushtimi i Tipave",

      content_sq: `
Type narrowing e ngushton një tip të gjerë në një tip më specifik përmes kontrolleve që TypeScript mund t'i analizojë.

Teknika:
- typeof: Për primitive.
- instanceof: Për instanca klasash.
- in: Për ekzistencën e vetive.
- Equality checks: Për vlera konkrete.
- Discriminated unions: Për struktura me një fushë diskriminuese.
- Custom predicates: Për funksione të formës value is SomeType.

Kontrollet duhet të verifikojnë të dhënat reale, jo thjesht t'i deklarojnë ato si të sigurta.
      `,

      content_en: `
Type narrowing uses runtime checks to refine a broad type into a more specific one. Common techniques include typeof, instanceof, in, equality checks, discriminated unions, and custom type predicates.
      `,

      example: `
interface Dog {
  kind: "dog";
  bark(): void;
}

interface Cat {
  kind: "cat";
  meow(): void;
}

type Pet = Dog | Cat;

function handlePet(pet: Pet) {
  if (pet.kind === "dog") {
    pet.bark();
  } else {
    pet.meow();
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function printValue(value: unknown): void {
  if (isString(value)) {
    console.log(value.toUpperCase());
  }
}
`,

      bestPractices: [
        {
          sq: "Prefero discriminated unions për modele me disa gjendje të njohura.",
          en: "Prefer discriminated unions for models with distinct known states."
        }
      ]
    },

    // =====================================================
    // 11. DISCRIMINATED UNIONS & EXHAUSTIVENESS
    // =====================================================
    {
      id: "discriminated-unions",
      title: "Discriminated Unions and Exhaustive Checks",
      title_sq: "Union-e të Diskriminuara dhe Kontrolli i Plotësisë",

      content_sq: `
Discriminated union përdor një fushë të përbashkët literal, si status ose kind, për të identifikuar variantin konkret.

Kontrolli exhaustiveness siguron që çdo variant të trajtohet. Tipi never ndihmon në zbulimin e rasteve të pambuluara.
      `,

      content_en: `
Discriminated unions model distinct variants using a shared literal property. Exhaustiveness checks help ensure every variant is handled.
      `,

      example: `
type Result<T> =
  | { status: "success"; data: T }
  | { status: "error"; message: string }
  | { status: "loading" };

function assertNever(value: never): never {
  throw new Error("Unexpected value: " + String(value));
}

function renderResult<T>(result: Result<T>): string {
  switch (result.status) {
    case "success":
      return "Loaded";
    case "error":
      return result.message;
    case "loading":
      return "Loading...";
    default:
      return assertNever(result);
  }
}
`
    },

    // =====================================================
    // 12. KEYOF, TYPEOF & INDEXED ACCESS
    // =====================================================
    {
      id: "keyof-typeof-indexed-access",
      title: "keyof, typeof, and Indexed Access Types",
      title_sq: "keyof, typeof dhe Tipat e Qasjes me Indeks",

      content_sq: `
keyof T krijon union-in e çelësave të tipit T.

typeof përdoret në kontekstin e tipeve për të marrë tipin e një vlere ekzistuese.

T[K] merr tipin e pronës K të tipit T.

Këto mekanizma mundësojnë krijimin e tipeve që ndjekin strukturën e objekteve burimore.
      `,

      content_en: `
keyof extracts property keys, typeof obtains the type of a value, and indexed access types retrieve the type of a specific property.
      `,

      example: `
const settings = {
  theme: "dark",
  pageSize: 20
};

type Settings = typeof settings;
type SettingKey = keyof Settings;
type ThemeValue = Settings["theme"];

function readSetting<K extends keyof Settings>(
  key: K
): Settings[K] {
  return settings[key];
}

const currentTheme = readSetting("theme");
`
    },

    // =====================================================
    // 13. MAPPED TYPES
    // =====================================================
    {
      id: "mapped-types",
      title: "Mapped Types",
      title_sq: "Mapped Types",

      content_sq: `
Mapped types ndërtojnë tipe të reja duke kaluar mbi çelësat e një tipi ekzistues.

Ato mund të shtojnë ose heqin modifikues si readonly dhe optional duke përdorur + ose -.
      `,

      content_en: `
Mapped types transform each property in an existing type and can add or remove modifiers such as readonly and optional.
      `,

      example: `
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type RequiredFields<T> = {
  [K in keyof T]-?: T[K];
};

type NullableValues<T> = {
  [K in keyof T]: T[K] | null;
};

interface Config {
  readonly host: string;
  port?: number;
}

type EditableConfig = Mutable<Config>;
type CompleteConfig = RequiredFields<Config>;
type NullableConfig = NullableValues<Config>;
`
    },

    // =====================================================
    // 14. CONDITIONAL TYPES
    // =====================================================
    {
      id: "conditional-types",
      title: "Conditional Types and infer",
      title_sq: "Conditional Types dhe infer",

      content_sq: `
Conditional types përdorin formën T extends U ? X : Y.

Ato zgjedhin një tip në varësi të marrëdhënies së një tipi me një tjetër. infer mund të nxjerrë një tip brenda kushtit.

Kur conditional type vepron mbi një parametër të shpërndarë union, mund të shpërndahet veçmas mbi secilin anëtar të union-it.
      `,

      content_en: `
Conditional types select a type based on assignability. The infer keyword can extract types inside a conditional type.
      `,

      example: `
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<number>;  // false

type ElementOf<T> =
  T extends readonly (infer U)[] ? U : T;

type Item = ElementOf<string[]>; // string

type UnwrapPromise<T> =
  T extends Promise<infer U> ? U : T;

type Data = UnwrapPromise<Promise<{ id: number }>>;
`
    },

    // =====================================================
    // 15. TEMPLATE LITERAL TYPES
    // =====================================================
    {
      id: "template-literal-types",
      title: "Template Literal Types",
      title_sq: "Template Literal Types",

      content_sq: `
Template literal types krijojnë tipe string nga literal-e dhe tipe të tjera.

Ato janë të dobishme për event names, prefikse, sufikse dhe API me çelësa të kufizuar.
      `,

      content_en: `
Template literal types construct string literal types from other types and literal values.
      `,

      example: `
type EventName = "click" | "focus" | "blur";
type HandlerName = \`on\${Capitalize<EventName>}\`;

// "onClick" | "onFocus" | "onBlur"

type CSSLength = \`\${number}px\` | \`\${number}rem\`;

const handler: HandlerName = "onClick";
const spacing: CSSLength = "1.5rem";
`
    },

    // =====================================================
    // 16. SATISFIES OPERATOR
    // =====================================================
    {
      id: "satisfies-operator",
      title: "The satisfies Operator",
      title_sq: "Operatori satisfies",

      content_sq: `
Operatori satisfies kontrollon nëse një shprehje përputhet me një tip të kërkuar pa e zëvendësuar domosdoshmërisht tipin e inferuar të shprehjes me atë tip të përgjithshëm.

Është i dobishëm për konfigurime, harta dhe objekte me vlera literal.
      `,

      content_en: `
The satisfies operator validates compatibility with a target type while generally preserving more specific inferred information about the expression.
      `,

      example: `
type RouteName = "home" | "about";

const routes = {
  home: "/",
  about: "/about"
} satisfies Record<RouteName, string>;

routes.home;

// Missing keys or incompatible values are rejected.
`
    },

    // =====================================================
    // 17. TYPE ASSERTIONS & CONST ASSERTIONS
    // =====================================================
    {
      id: "type-assertions",
      title: "Type Assertions and Const Assertions",
      title_sq: "Type Assertions dhe Const Assertions",

      content_sq: `
Type assertion i tregon TypeScript-it se si duhet trajtuar një shprehje në nivel tipi. Sintaksa është value as Type.

Assertion nuk kryen konvertim ose validim në runtime.

as const ruan literal-et sa më specifike dhe e bën objektin ose tuple-n readonly në nivel tipi.
      `,

      content_en: `
Type assertions affect static type interpretation without runtime validation. Const assertions preserve literal types and produce readonly object or tuple types.
      `,

      example: `
const direction = "north" as const;

const coordinates = [10, 20] as const;
// readonly [10, 20]

const element = document.querySelector("#app");

if (element instanceof HTMLElement) {
  element.hidden = false;
}

// Avoid assertions that have not been validated.
`
    },

    // =====================================================
    // 18. CLASSES & ACCESS MODIFIERS
    // =====================================================
    {
      id: "classes",
      title: "Classes and Access Modifiers",
      title_sq: "Klasat dhe Modifikuesit e Qasjes",

      content_sq: `
TypeScript mbështet klasa, implementimin e interfaces, trashëgiminë dhe modifikuesit e qasjes.

- public: Qasje publike.
- protected: Qasje në klasë dhe nënklasa.
- private: Kufizim i qasjes në nivel TypeScript.
- readonly: Ndalon caktimin e ri pas inicializimit sipas rregullave të gjuhës.

Parametrat e konstruktorit mund të deklarohen si parameter properties duke përdorur modifikues.
      `,

      content_en: `
TypeScript classes support interfaces, inheritance, access modifiers, and readonly properties. Constructor parameter properties provide concise field declarations.
      `,

      example: `
interface Identifiable {
  getId(): string;
}

class Account implements Identifiable {
  constructor(
    public readonly id: string,
    private balance: number
  ) {}

  getId(): string {
    return this.id;
  }

  deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    this.balance += amount;
  }
}
`
    },

    // =====================================================
    // 19. NULLABILITY & OPTIONAL CHAINING
    // =====================================================
    {
      id: "nullability",
      title: "Nullability and Optional Access",
      title_sq: "Nullability dhe Qasja Opsionale",

      content_sq: `
Me strictNullChecks aktiv, null dhe undefined trajtohen si tipe të veçanta.

Operatori ?. kryen qasje të sigurt në pronë ose metodë kur vlera në të majtë është nullish.

Operatori ?? jep një vlerë rezervë vetëm kur shprehja është null ose undefined. Ndryshe nga ||, ai nuk e zëvendëson 0, false ose string-un bosh.
      `,

      content_en: `
With strictNullChecks, null and undefined are distinct types. Optional chaining safely accesses nullable values, while nullish coalescing provides defaults only for nullish values.
      `,

      example: `
interface UserProfile {
  name: string;
  preferences?: {
    theme?: string;
  };
}

function getTheme(user: UserProfile | undefined): string {
  return user?.preferences?.theme ?? "light";
}

const count = 0;
const safeCount = count ?? 10; // 0

const label = "";
const safeLabel = label || "Default"; // "Default"
`
    },

    // =====================================================
    // 20. ASYNC TYPES & PROMISES
    // =====================================================
    {
      id: "async-types",
      title: "Async Functions and Promise Types",
      title_sq: "Funksionet Async dhe Tipat Promise",

      content_sq: `
Funksionet async kthejnë Promise. Tipi i rezultatit të Promise përshkruan vlerën që merret pas await.

TypeScript nuk garanton që kërkesa HTTP, JSON ose përgjigjja e serverit përputhet me tipin e deklaruar. Të dhënat e jashtme duhen validuar.
      `,

      content_en: `
Async functions return promises. Promise<T> describes the resolved value, but external responses still require runtime validation.
      `,

      example: `
interface User {
  id: string;
  name: string;
}

async function fetchUserName(): Promise<string> {
  return "Arta";
}

async function loadUser(): Promise<User> {
  return {
    id: "u1",
    name: "Arta"
  };
}

async function main(): Promise<void> {
  const name = await fetchUserName();
  console.log(name);
}
`
    },

    // =====================================================
    // 21. TYPE-SAFE ERROR HANDLING
    // =====================================================
    {
      id: "error-handling",
      title: "Type-Safe Error Handling",
      title_sq: "Trajtimi i Gabimeve me Siguri Tipash",

      content_sq: `
Vlera e kapur nga catch duhet trajtuar si unknown, sepse JavaScript lejon hedhjen e çdo vlere.

Kontrollo nëse gabimi është instance e Error përpara se të lexosh mesazhin. Për rezultate biznesi të pritshme, mund të përdorësh Result union në vend të exception.
      `,

      content_en: `
Caught errors should be treated as unknown because JavaScript can throw arbitrary values. Validate errors before accessing their properties.
      `,

      example: `
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function parsePositiveNumber(input: string): Result<number> {
  const value = Number(input);

  if (!Number.isFinite(value) || value <= 0) {
    return {
      ok: false,
      error: "Expected a positive finite number"
    };
  }

  return { ok: true, value };
}
`
    },

    // =====================================================
    // 22. RUNTIME VALIDATION
    // =====================================================
    {
      id: "runtime-validation",
      title: "Runtime Validation and External Data",
      title_sq: "Validimi në Runtime dhe të Dhënat e Jashtme",

      content_sq: `
TypeScript tipi any dhe type assertions nuk validojnë JSON, formularë ose përgjigje API në runtime.

Për të dhëna të jashtme:
1. Trajto hyrjen si unknown.
2. Kontrollo strukturën.
3. Verifiko fushat dhe tipat.
4. Kthe një rezultat të tipizuar vetëm pasi validimi të ketë sukses.

Për projekte të mëdha, biblioteka validimi si Zod ose Valibot mund të ndihmojnë.
      `,

      content_en: `
TypeScript types disappear at runtime. External data should be validated before being trusted as a domain type.
      `,

      example: `
interface Product {
  id: string;
  price: number;
}

function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("id" in value) || !("price" in value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.price === "number" &&
    Number.isFinite(value.price)
  );
}

function parseProduct(input: unknown): Product {
  if (!isProduct(input)) {
    throw new Error("Invalid product data");
  }

  return input;
}
`
    },

    // =====================================================
    // 23. DECLARATION FILES & MODULES
    // =====================================================
    {
      id: "declaration-files",
      title: "Declaration Files and Modules",
      title_sq: "Skedarët e Deklarimeve dhe Modulet",

      content_sq: `
Skedarët .d.ts përshkruajnë tipat e një API-je ekzistuese pa implementim runtime.

Modulet ES përdorin import dhe export. Deklarimet ambient përshkruajnë funksione globale ose biblioteka që nuk kanë tipe të integruara.

Përdor deklarime të sakta për të shmangur siguri të rreme në sistemin e tipeve.
      `,

      content_en: `
Declaration files describe the types of JavaScript APIs without providing runtime implementations. ES modules use import and export to define module boundaries.
      `,

      example: `
// math-utils.d.ts
export declare function add(
  a: number,
  b: number
): number;

// app.ts
import { add } from "./math-utils.js";

const result = add(2, 3);
`
    },

    // =====================================================
    // 24. TSCONFIG & STRICT MODE
    // =====================================================
    {
      id: "tsconfig",
      title: "TSConfig and Strict Compiler Options",
      title_sq: "TSConfig dhe Opsionet Strikte të Kompiluesit",

      content_sq: `
tsconfig.json përcakton opsionet e kompilimit dhe skedarët e projektit.

Opsione të rëndësishme:
- strict: Aktivizon grupin e kontrolleve strikte.
- noUncheckedIndexedAccess: Shton undefined për qasje të pasigurt me indeks.
- exactOptionalPropertyTypes: Dallon më saktë pronat opsionale.
- noImplicitOverride: Kërkon override të qartë për metoda të mbivendosura.
- noEmit: Kryen kontroll pa prodhuar skedarë output.
- target: Versioni i synuar i JavaScript.
- module/moduleResolution: Strategjia e moduleve.

Konfigurimi duhet përshtatur me runtime dhe mjetet e projektit.
      `,

      content_en: `
tsconfig.json controls compiler behavior, module resolution, target JavaScript version, and project files. Strict options improve type safety but should match the project's runtime and tooling.
      `,

      example: `
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
`
    },

    // =====================================================
    // 25. TYPE TESTING & DEBUGGING
    // =====================================================
    {
      id: "type-testing",
      title: "Type Testing and Compiler Debugging",
      title_sq: "Testimi i Tipave dhe Debugging i Kompiluesit",

      content_sq: `
Type tests verifikojnë sjelljen e sistemit të tipeve, jo vetëm rezultatet runtime.

Teknikat përfshijnë:
- @ts-expect-error për të dokumentuar një gabim të pritshëm.
- Teste compile-time për API-të publike.
- Ndërtim të shembujve minimalë për gabime komplekse.
- Kontroll të versionit të TypeScript dhe tsconfig.

Mos e përdor @ts-ignore pa arsye të dokumentuar, sepse mund të fshehë gabime reale.
      `,

      content_en: `
Type tests verify compile-time behavior. Use expected-error directives carefully, isolate complex failures, and check compiler versions and configuration.
      `,

      example: `
function double(value: number): number {
  return value * 2;
}

double(10);

// @ts-expect-error A string is not a number.
double("10");
`
    },

    // =====================================================
    // 26. COMMON ANTI-PATTERNS
    // =====================================================
    {
      id: "anti-patterns",
      title: "Common TypeScript Anti-Patterns",
      title_sq: "Anti-Patterns të Zakonshme në TypeScript",

      content_sq: `
Gabime të zakonshme:
- Përdorimi i any kudo.
- Përdorimi i as SomeType pa validim.
- Non-null assertion (!) pa kontroll.
- Përdorimi i tipeve tepër të gjera.
- Përsëritja e tipeve që mund të nxirren nga një burim.
- Mbështetja te TypeScript për validimin e API-ve runtime.
- Mbajtja e konfigurimit jo-strikt pa arsye.

Qëllimi nuk është të tipizosh çdo rresht, por të krijosh kontrata të besueshme.
      `,

      content_en: `
Avoid widespread any, unchecked assertions, unnecessary non-null assertions, duplicated type definitions, and assumptions that static types validate runtime data.
      `,

      example: `
// Avoid
function getUser(input: any): any {
  return input;
}

// Better
interface User {
  id: string;
  name: string;
}

function getUser(input: User): User {
  return input;
}

// External inputs still need runtime validation.
`
    },

    // =====================================================
    // 27. FINAL BEST PRACTICES
    // =====================================================
    {
      id: "best-practices",
      title: "Production TypeScript Best Practices",
      title_sq: "Praktikat më të Mira për TypeScript në Production",

      content_sq: `
1. Aktivizo strict mode.
2. Prefero unknown mbi any për hyrje të panjohura.
3. Përdor union literals për gjendje të kufizuara.
4. Përdor generics kur duhet të ruash marrëdhënien mes tipeve.
5. Përdor utility types për të shmangur përsëritjen.
6. Përdor discriminated unions për gjendje të qarta.
7. Valido të dhënat e jashtme në runtime.
8. Mbaj kontratat publike të thjeshta.
9. Testo tipat e API-ve kritike.
10. Përdor version të qëndrueshëm dhe të përditësuar të TypeScript.
      `,

      content_en: `
Enable strict checking, avoid unsafe any, use literal unions and generics appropriately, validate external data, keep public APIs clear, and test critical type contracts.
      `
    },

    // =====================================================
    // 28. GLOSSARY
    // =====================================================
    {
      id: "glossary",
      title: "TypeScript Glossary",
      title_sq: "Fjalorthi i TypeScript",

      terms: [
        {
          term: "Static Type Checking",
          definition_sq: "Kontrolli i përputhshmërisë së tipeve gjatë zhvillimit ose kompilimit.",
          definition_en: "Checking type compatibility during development or compilation."
        },
        {
          term: "Type Inference",
          definition_sq: "Përcaktimi automatik i tipeve nga konteksti dhe vlerat.",
          definition_en: "Automatic determination of types from context and values."
        },
        {
          term: "Union Type",
          definition_sq: "Tip që pranon një nga disa tipe të mundshme.",
          definition_en: "A type that accepts one of several possible types."
        },
        {
          term: "Intersection Type",
          definition_sq: "Tip që kombinon kërkesat e disa tipeve.",
          definition_en: "A type combining the requirements of multiple types."
        },
        {
          term: "Generic",
          definition_sq: "Parametër tipi që mundëson ripërdorimin duke ruajtur sigurinë e tipit.",
          definition_en: "A type parameter enabling reuse while preserving type safety."
        },
        {
          term: "Type Guard",
          definition_sq: "Kontroll që ndihmon TypeScript të ngushtojë një tip.",
          definition_en: "A check that helps TypeScript narrow a type."
        },
        {
          term: "Utility Type",
          definition_sq: "Tip i integruar që transformon tipe të tjera.",
          definition_en: "A built-in type that transforms other types."
        },
        {
          term: "Type Assertion",
          definition_sq: "Udhëzim statik për interpretimin e tipit pa validim runtime.",
          definition_en: "A static instruction about type interpretation without runtime validation."
        },
        {
          term: "Discriminated Union",
          definition_sq: "Union me një fushë literal që dallon variantet.",
          definition_en: "A union with a literal property distinguishing its variants."
        },
        {
          term: "Declaration File",
          definition_sq: "Skedar .d.ts që përshkruan tipat e një API-je.",
          definition_en: "A .d.ts file describing an API's types."
        }
      ]
    }
  ]
};

// CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = typeScriptFundamentalsKnowledge;
}
