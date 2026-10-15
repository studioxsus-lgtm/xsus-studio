// ============================================================================
// XSUS AI - PHP FUNDAMENTALS & WEB BACKEND MASTER KNOWLEDGE BASE
// Version: 2.0.0
// Bilingual Structured Knowledge Engine
// ============================================================================

export const phpFundamentalsKnowledge = {
  id: "php-fundamentals",
  title: "PHP Fundamentals & Web Backend Master Knowledge Base",
  title_sq: "Njohuritë Themelore të PHP dhe Backend Web",
  description:
    "A comprehensive bilingual knowledge base covering modern PHP, syntax, types, functions, arrays, OOP, Composer, namespaces, HTTP, forms, databases, PDO, REST APIs, authentication, security, testing, and backend architecture.",
  description_sq:
    "Një bazë gjithëpërfshirëse dygjuhëshe për PHP moderne, sintaksën, tipat, funksionet, array-t, OOP, Composer, namespaces, HTTP, formularët, bazat e të dhënave, PDO, API-të REST, autentikimin, sigurinë, testimin dhe arkitekturën backend.",
  version: "2.0.0",
  language: ["sq", "en"],

  sections: [
    // =====================================================
    // 1. PHP INTRODUCTION AND SYNTAX
    // =====================================================
    {
      id: "php-intro",
      title: "PHP Introduction and Basic Syntax",
      title_sq: "Hyrje në PHP dhe Sintaksa Bazë",

      content_sq: `
PHP (PHP: Hypertext Preprocessor) është një gjuhë programimi që përdoret gjerësisht për zhvillimin e aplikacioneve web në anën e serverit.

Kodi PHP ekzekutohet në server. Serveri mund të përpunojë kërkesa HTTP, të komunikojë me databaza dhe të gjenerojë HTML ose përgjigje JSON.

Karakteristikat kryesore:
- Kodi PHP zakonisht fillon me <?php.
- Instruksionet zakonisht përfundojnë me pikëpresje (;).
- Variablat fillojnë me shenjën $.
- PHP mbështet programimin procedural dhe atë të orientuar nga objektet.
- PHP 8+ ofron veçori moderne si named arguments, attributes, match expressions dhe constructor property promotion.
- PHP mund të përdoret për aplikacione web, API, komanda CLI dhe procese të automatizuara.

PHP është gjuhë me tipizim dinamik, por mbështet edhe deklarimin e tipeve dhe kontrollin më të rreptë të tyre.
      `,

      content_en: `
PHP (PHP: Hypertext Preprocessor) is a widely used programming language for server-side web development.

PHP code executes on the server. It can process HTTP requests, communicate with databases, and generate HTML or JSON responses.

Key characteristics:
- PHP code usually starts with <?php.
- Statements generally end with a semicolon.
- Variables start with $.
- PHP supports procedural and object-oriented programming.
- PHP 8+ provides modern features such as named arguments, attributes, match expressions, and constructor property promotion.
- PHP supports web applications, APIs, CLI commands, and automated processes.

PHP is dynamically typed but also supports type declarations and stricter type checking.
      `,

      example: `
<?php

declare(strict_types=1);

$message = "Mirë se erdhe në XSUS AI";

echo "<h1>" . htmlspecialchars(
    $message,
    ENT_QUOTES | ENT_SUBSTITUTE,
    "UTF-8"
) . "</h1>";
`,

      bestPractices: [
        {
          sq: "Përdor declare(strict_types=1) në skedarët ku dëshiron kontroll më të rreptë të tipeve.",
          en: "Use declare(strict_types=1) in files where stricter type checking is desired."
        },
        {
          sq: "Mos përdor etiketën mbyllëse ?> në skedarët që përmbajnë vetëm PHP.",
          en: "Omit the closing PHP tag in files containing only PHP."
        },
        {
          sq: "Përdor një version PHP që mbështetet ende dhe përditësoje rregullisht.",
          en: "Use a currently supported PHP version and keep it updated."
        }
      ]
    },

    // =====================================================
    // 2. VARIABLES AND DATA TYPES
    // =====================================================
    {
      id: "variables-datatypes",
      title: "Variables and Data Types",
      title_sq: "Variablat dhe Tipat e të Dhënave",

      content_sq: `
Variablat përdoren për të ruajtur vlera dhe fillojnë me shenjën $.

Tipat kryesorë:
- string: tekst.
- int: numër i plotë.
- float: numër me presje dhjetore.
- bool: true ose false.
- array: koleksion vlerash.
- object: instancë e një klase.
- null: mungesë vlere.
- callable: funksion ose objekt i thirrshëm.
- iterable: vlerë që mund të përdoret në foreach.

PHP mbështet edhe union types, nullable types dhe intersection types në versionet përkatëse.

Me === kontrollohen njëkohësisht vlera dhe tipi, ndërsa == mund të kryejë konvertime gjatë krahasimit.
      `,

      content_en: `
Variables store values and begin with the $ symbol.

Core types include string, int, float, bool, array, object, and null. PHP also supports callable and iterable types, as well as union, nullable, and intersection types in supported versions.

The === operator compares both value and type, while == may perform type conversions.
      `,

      example: `
<?php

declare(strict_types=1);

$name = "Arta";
$age = 28;
$price = 19.99;
$isActive = true;
$tags = ["php", "api", "backend"];
$middleName = null;

var_dump($name);
var_dump($age);

if ($isActive === true) {
    echo "Llogaria është aktive.";
}
`,

      bestPractices: [
        {
          sq: "Përdor emra variablash që përshkruajnë kuptimin e tyre.",
          en: "Use descriptive variable names."
        },
        {
          sq: "Prefero krahasimin e rreptë === kur dëshiron të shmangësh konvertimet e papritura.",
          en: "Prefer strict comparison with === to avoid unexpected type conversions."
        }
      ]
    },

    // =====================================================
    // 3. CONTROL STRUCTURES AND LOOPS
    // =====================================================
    {
      id: "control-structures",
      title: "Control Structures and Loops",
      title_sq: "Strukturat e Kontrollit dhe Ciklet",

      content_sq: `
PHP ofron struktura për vendimmarrje dhe përsëritje:
- if, elseif, else.
- switch.
- match, i disponueshëm nga PHP 8.0.
- for, while dhe do-while.
- foreach për koleksionet dhe array-t.

match është një shprehje që kthen rezultat, përdor krahasim të rreptë dhe nuk ka nevojë për break. switch ka semantikë të ndryshme dhe mund të përdorë krahasime jo të rrepta.
      `,

      content_en: `
PHP provides control structures for decision-making and iteration, including if, elseif, else, switch, match, for, while, do-while, and foreach.

The match expression, available since PHP 8.0, returns a value and uses strict comparison. Unlike switch, it does not require break statements.
      `,

      example: `
<?php

$role = "admin";

$accessLevel = match ($role) {
    "admin" => "Full access",
    "editor" => "Content access",
    "user" => "Basic access",
    default => "No access",
};

$colors = ["red", "green", "blue"];

foreach ($colors as $color) {
    echo htmlspecialchars($color, ENT_QUOTES, "UTF-8") . PHP_EOL;
}
`,

      bestPractices: [
        {
          sq: "Përdor match për shprehje të qarta kur kushtet krahasojnë vlera të caktuara.",
          en: "Use match for clear expressions that compare specific values."
        },
        {
          sq: "Mos u mbështet te vlera e rolit që vjen nga kërkesa pa e verifikuar në server.",
          en: "Never trust a role supplied by a request without verifying it on the server."
        }
      ]
    },

    // =====================================================
    // 4. FUNCTIONS AND TYPE DECLARATIONS
    // =====================================================
    {
      id: "php-functions",
      title: "Functions, Parameters, and Return Types",
      title_sq: "Funksionet, Parametrat dhe Tipat e Kthimit",

      content_sq: `
Funksionet organizojnë logjikën në njësi të ripërdorshme.

PHP mbështet:
- Parametra dhe vlera të parazgjedhura.
- Type declarations për parametrat.
- Return types për vlerat e kthyera.
- Named arguments.
- Variadic parameters.
- Anonymous functions dhe arrow functions.
- Closures dhe callbacks.

declare(strict_types=1) ndikon në mënyrën se si trajtohen deklarimet e tipeve skalare për thirrjet që vijnë nga ai skedar; nuk e kthen PHP në gjuhë plotësisht statike.
      `,

      content_en: `
Functions organize logic into reusable units.

PHP supports default parameters, parameter and return type declarations, named arguments, variadic parameters, anonymous functions, arrow functions, closures, and callbacks.

declare(strict_types=1) affects scalar type handling for calls originating from that file; it does not make PHP a fully statically typed language.
      `,

      example: `
<?php

declare(strict_types=1);

function calculateTotal(float $price, int $quantity): float
{
    if ($price < 0 || $quantity < 0) {
        throw new InvalidArgumentException(
            "Price and quantity must be non-negative."
        );
    }

    return $price * $quantity;
}

$total = calculateTotal(15.50, 3);

echo number_format($total, 2, ".", "");
`,

      bestPractices: [
        {
          sq: "Përdor tipe parametrash dhe tipe kthimi për ta bërë kontratën e funksionit të qartë.",
          en: "Use parameter and return types to make function contracts explicit."
        },
        {
          sq: "Përdor exceptions për gabime që duhet të trajtohen nga shtresat përkatëse të aplikacionit.",
          en: "Use exceptions for errors that should be handled by the appropriate application layer."
        }
      ]
    },

    // =====================================================
    // 5. ARRAYS AND ITERABLES
    // =====================================================
    {
      id: "php-arrays",
      title: "Arrays, Associative Arrays, and Iteration",
      title_sq: "Array-t, Array-t Asociative dhe Iterimi",

      content_sq: `
Array në PHP mund të përdoret si listë, hartë çelës-vlerë ose strukturë e kombinuar.

Llojet dhe përdorimet:
- Array me indekse numerike.
- Array asociative me çelësa tekstualë.
- Array shumëdimensionale.
- Funksione si array_map, array_filter dhe array_reduce.
- Traversim me foreach.
- Gjenerues me yield për përpunim të të dhënave me memorie më të ulët.

Për strukturat komplekse të domenit mund të jenë më të përshtatshme klasat, DTO-të ose objektet e dedikuara.
      `,

      content_en: `
PHP arrays can function as lists, key-value maps, or combined structures.

Common patterns include indexed arrays, associative arrays, multidimensional arrays, array_map, array_filter, array_reduce, foreach iteration, and generators using yield.

For complex domain structures, classes, DTOs, or dedicated objects may be more suitable.
      `,

      example: `
<?php

$user = [
    "name" => "Arta",
    "email" => "arta@example.com",
    "active" => true,
];

$products = [
    ["name" => "Keyboard", "price" => 49.99],
    ["name" => "Mouse", "price" => 19.99],
];

$names = array_map(
    fn(array $product): string => $product["name"],
    $products
);

echo $user["name"];
print_r($names);
`,

      bestPractices: [
        {
          sq: "Kontrollo ekzistencën e çelësave para se të përdorësh të dhëna potencialisht të munguara.",
          en: "Check whether keys exist before accessing potentially missing data."
        },
        {
          sq: "Përdor struktura të qarta dhe shmang array-t tepër të thellë kur një klasë do ta shprehte më mirë modelin.",
          en: "Use clear structures and avoid deeply nested arrays when a class would better represent the model."
        }
      ]
    },

    // =====================================================
    // 6. STRINGS, NULL, AND ERROR HANDLING
    // =====================================================
    {
      id: "strings-errors",
      title: "String Handling, Null, and Error Handling",
      title_sq: "Përpunimi i Tekstit, Null dhe Trajtimi i Gabimeve",

      content_sq: `
PHP ofron funksione për përpunimin e tekstit, si trim, strlen, substr, str_contains dhe sprintf.

Për trajtimin e mungesës së vlerave përdoren null, operatori ?? dhe operatori nullsafe ?->.

Për gabimet:
- Exceptions për situata që duhet të trajtohen.
- try/catch për kapjen e exceptions.
- finally për logjikë që duhet të ekzekutohet në fund.
- Error dhe Throwable për hierarkinë e gabimeve të PHP-së.

Gabimet teknike nuk duhet t'i shfaqen drejtpërdrejt përdoruesit në ambientin production.
      `,

      content_en: `
PHP provides string functions such as trim, strlen, substr, str_contains, and sprintf.

Missing values can be handled with null, the ?? operator, and the nullsafe ?-> operator.

Error handling includes exceptions, try/catch, finally, and the Throwable hierarchy. Technical errors should not be exposed directly to users in production.
      `,

      example: `
<?php

$email = trim($_POST["email"] ?? "");

try {
    if ($email === "") {
        throw new InvalidArgumentException(
            "Email is required."
        );
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException(
            "Invalid email format."
        );
    }

    echo "Email format is valid.";
} catch (InvalidArgumentException $e) {
    echo htmlspecialchars(
        $e->getMessage(),
        ENT_QUOTES | ENT_SUBSTITUTE,
        "UTF-8"
    );
}
`,

      bestPractices: [
        {
          sq: "Dallo mungesën e një vlere nga një tekst bosh dhe nga vlera false.",
          en: "Distinguish a missing value from an empty string and from false."
        },
        {
          sq: "Mos e përdor @ për të fshehur gabimet që duhet të diagnostikohen.",
          en: "Do not use @ to suppress errors that need to be diagnosed."
        }
      ]
    },

    // =====================================================
    // 7. SUPERGLOBALS AND HTTP FORMS
    // =====================================================
    {
      id: "superglobals-forms",
      title: "Superglobals and HTTP Form Handling",
      title_sq: "Superglobalet dhe Trajtimi i Formularëve HTTP",

      content_sq: `
Superglobalet janë variabla të integruara të PHP-së.

Më të përdorurat:
- $_GET: parametra nga URL-ja.
- $_POST: të dhëna nga formularët.
- $_SERVER: informacione për kërkesën dhe serverin.
- $_SESSION: të dhëna të sesionit.
- $_COOKIE: cookie-t e kërkesës.
- $_FILES: informacionet e skedarëve të ngarkuar.
- $_ENV: variabla të ambientit, sipas konfigurimit.
- $GLOBALS: qasje në variablat globale.

Të dhënat nga klienti janë të pabesueshme. Validimi kontrollon nëse të dhënat plotësojnë rregullat; escaping kryhet sipas kontekstit ku do të përdoren.
      `,

      content_en: `
PHP superglobals are built-in variables.

Common examples include $_GET, $_POST, $_SERVER, $_SESSION, $_COOKIE, $_FILES, $_ENV, and $GLOBALS.

Client-provided data is untrusted. Validation checks whether data satisfies expected rules; escaping must be performed according to the output context.
      `,

      example: `
<?php

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = trim($_POST["username"] ?? "");

    if ($username === "" || strlen($username) > 80) {
        http_response_code(422);
        echo "Invalid username.";
        exit;
    }

    echo "Welcome, " . htmlspecialchars(
        $username,
        ENT_QUOTES | ENT_SUBSTITUTE,
        "UTF-8"
    );
}
?>

<form method="POST" action="">
    <label for="username">Username</label>
    <input
        id="username"
        name="username"
        maxlength="80"
        required
    >
    <button type="submit">Submit</button>
</form>
`,

      bestPractices: [
        {
          sq: "Përdor validim në server edhe kur formulari ka validim HTML.",
          en: "Validate input on the server even when HTML form validation is present."
        },
        {
          sq: "Përdor htmlspecialchars për dalje HTML, jo si zëvendësim për çdo lloj validimi.",
          en: "Use htmlspecialchars for HTML output, not as a substitute for all validation."
        },
        {
          sq: "Për operacionet që ndryshojnë të dhëna, përdor POST dhe mbrojtje CSRF.",
          en: "Use POST and CSRF protection for operations that modify data."
        }
      ]
    },

    // =====================================================
    // 8. OBJECT-ORIENTED PROGRAMMING
    // =====================================================
    {
      id: "php-oop",
      title: "Object-Oriented Programming in PHP",
      title_sq: "Programimi i Orientuar nga Objektet në PHP",

      content_sq: `
PHP mbështet programimin e orientuar nga objektet përmes klasave dhe objekteve.

Konceptet kryesore:
- Encapsulation: kontrolli i qasjes në gjendjen e objektit.
- Inheritance: trashëgimia e sjelljes nga një klasë bazë.
- Polymorphism: përdorimi i implementimeve të ndryshme përmes kontratave të përbashkëta.
- Abstraction: fshehja e detajeve të panevojshme.
- Interfaces: kontrata që klasat implementojnë.
- Traits: ripërdorimi i sjelljes në klasa.
- Abstract classes: klasa që shërbejnë si bazë.
- Constructor property promotion dhe readonly properties në versionet përkatëse të PHP-së.

Përdor kompozimin kur është më i përshtatshëm se trashëgimia.
      `,

      content_en: `
PHP supports object-oriented programming through classes and objects.

Core concepts include encapsulation, inheritance, polymorphism, abstraction, interfaces, traits, abstract classes, constructor property promotion, and readonly properties in supported PHP versions.

Prefer composition over inheritance when it produces a clearer design.
      `,

      example: `
<?php

declare(strict_types=1);

final class Product
{
    public function __construct(
        public readonly string $title,
        private readonly float $price
    ) {
        if ($price < 0) {
            throw new InvalidArgumentException(
                "Price cannot be negative."
            );
        }
    }

    public function getPrice(): float
    {
        return $this->price;
    }

    public function getInfo(): string
    {
        return sprintf(
            "Product: %s, Price: %.2f EUR",
            $this->title,
            $this->price
        );
    }
}

$product = new Product("Keyboard", 49.99);

echo $product->getInfo();
`,

      bestPractices: [
        {
          sq: "Përdor private për gjendjen që nuk duhet ndryshuar drejtpërdrejt nga jashtë.",
          en: "Use private properties for state that should not be modified directly from outside."
        },
        {
          sq: "Mbaji klasat të përqendruara në një përgjegjësi të qartë.",
          en: "Keep classes focused on a clear responsibility."
        }
      ]
    },

    // =====================================================
    // 9. INTERFACES, NAMESPACES, AND AUTOLOADING
    // =====================================================
    {
      id: "namespaces-autoloading",
      title: "Interfaces, Namespaces, and Autoloading",
      title_sq: "Interfaces, Namespaces dhe Ngarkimi Automatik",

      content_sq: `
Namespaces organizojnë klasat, ndërfaqet, funksionet dhe konstantet për të shmangur konfliktet e emrave.

Interfaces përcaktojnë kontrata që implementohen nga klasat.

Autoloading mundëson ngarkimin automatik të klasave kur nevojiten. Në projektet moderne PHP, Composer përdoret zakonisht për këtë qëllim.

PSR-4 është një standard i përhapur për lidhjen e namespaces me strukturën e skedarëve.
      `,

      content_en: `
Namespaces organize classes, interfaces, functions, and constants to avoid naming conflicts.

Interfaces define contracts implemented by classes.

Autoloading loads classes when needed. Modern PHP projects commonly use Composer, with PSR-4 as a widely adopted standard for mapping namespaces to file paths.
      `,

      example: `
<?php
// src/Contracts/PaymentGateway.php

namespace App\\Contracts;

interface PaymentGateway
{
    public function charge(int $amountInCents): bool;
}
`,

      bestPractices: [
        {
          sq: "Përdor namespaces sipas organizimit logjik të projektit.",
          en: "Use namespaces that reflect the project's logical organization."
        },
        {
          sq: "Përdor Composer autoloading në vend të shumë kërkesave manuale require.",
          en: "Use Composer autoloading instead of numerous manual require statements."
        }
      ]
    },

    // =====================================================
    // 10. COMPOSER AND DEPENDENCY MANAGEMENT
    // =====================================================
    {
      id: "php-composer",
      title: "Composer and Dependency Management",
      title_sq: "Composer dhe Menaxhimi i Varësive",

      content_sq: `
Composer është menaxhuesi standard i varësive për projektet moderne PHP.

Ai përdoret për:
- Instalimin dhe përditësimin e paketave.
- Menaxhimin e versioneve të varësive.
- Autoloading të klasave.
- Skripte automatizimi.
- Përkufizimin e varësive development dhe production.

composer.json përshkruan konfigurimin dhe varësitë e projektit. composer.lock regjistron versionet konkrete të zgjidhura për instalim të përsëritshëm.

Komandat e zakonshme përfshijnë composer install, composer update dhe composer dump-autoload.
      `,

      content_en: `
Composer is the standard dependency manager for modern PHP projects.

It manages package installation, dependency versions, class autoloading, automation scripts, and development versus production dependencies.

composer.json describes project configuration and dependencies. composer.lock records resolved package versions for reproducible installations.
      `,

      example: `
{
  "name": "xsus-ai/backend",
  "description": "XSUS AI PHP backend",
  "type": "project",
  "require": {
    "php": "^8.2"
  },
  "autoload": {
    "psr-4": {
      "App\\\\": "src/"
    }
  }
}
`,

      bestPractices: [
        {
          sq: "Ruaje composer.lock në version control për aplikacionet.",
          en: "Commit composer.lock for application projects."
        },
        {
          sq: "Mos e modifiko manualisht composer.lock; përdor komandat Composer.",
          en: "Do not edit composer.lock manually; use Composer commands."
        },
        {
          sq: "Kontrollo varësitë për dobësi sigurie dhe përditësoji në mënyrë të kontrolluar.",
          en: "Check dependencies for security vulnerabilities and update them deliberately."
        }
      ]
    },

    // =====================================================
    // 11. DATABASE INTEGRATION WITH PDO
    // =====================================================
    {
      id: "php-pdo",
      title: "Database Integration with PDO",
      title_sq: "Integrimi me Databazën përmes PDO",

      content_sq: `
PDO (PHP Data Objects) ofron një ndërfaqe të unifikuar për komunikimin me databaza të ndryshme.

Përfitimet:
- Prepared statements për parametrat e pyetjeve.
- Trajtim i gabimeve përmes exceptions.
- Mbështetje për transaksione, kur databaza dhe drejtuesi e mbështesin.
- Mundësi për të marrë rezultate si array asociative ose objekte.

Prepared statements ndihmojnë në parandalimin e SQL injection kur parametrat përdoren saktë. Emrat e tabelave dhe kolonave zakonisht nuk mund të lidhen si parametra; identifikuesit dinamikë duhet të vijnë nga lista të lejuara.
      `,

      content_en: `
PDO provides a consistent interface for working with different databases.

It supports prepared statements, exception-based error handling, transactions where supported, and fetching results as associative arrays or objects.

Prepared statements help prevent SQL injection when parameters are used correctly. Table and column identifiers generally cannot be bound as parameters, so dynamic identifiers must come from allowlists.
      `,

      example: `
<?php

$dsn = "pgsql:host=localhost;port=5432;dbname=myapp";

$pdo = new PDO($dsn, getenv("DB_USER"), getenv("DB_PASSWORD"), [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);

$email = "arta@example.com";

$stmt = $pdo->prepare(
    "SELECT id, email FROM users WHERE email = :email"
);

$stmt->execute(["email" => $email]);

$user = $stmt->fetch();

if ($user !== false) {
    echo htmlspecialchars(
        $user["email"],
        ENT_QUOTES | ENT_SUBSTITUTE,
        "UTF-8"
    );
}
`,

      bestPractices: [
        {
          sq: "Mos i vendos kredencialet e databazës drejtpërdrejt në kodin burimor.",
          en: "Do not hardcode database credentials in source code."
        },
        {
          sq: "Përdor prepared statements për vlerat e futura në pyetjet SQL.",
          en: "Use prepared statements for values supplied to SQL queries."
        },
        {
          sq: "Mos i shfaq përdoruesit detajet e brendshme të PDOException.",
          en: "Do not expose internal PDOException details to users."
        }
      ]
    },

    // =====================================================
    // 12. SQL TRANSACTIONS AND DATA INTEGRITY
    // =====================================================
    {
      id: "php-database-transactions",
      title: "Database Transactions and Data Integrity",
      title_sq: "Transaksionet e Databazës dhe Integriteti i të Dhënave",

      content_sq: `
Transaksionet lejojnë grupimin e operacioneve të databazës në një njësi logjike.

Metodat kryesore të PDO:
- beginTransaction()
- commit()
- rollBack()

Nëse një operacion dështon, rollback mund të rikthejë ndryshimet e transaksionit.

Transaksionet janë veçanërisht të dobishme për pagesa, transferime, porosi dhe procese që ndryshojnë disa tabela. Sjellja konkrete varet nga databaza, engine-i dhe izolimi i transaksionit.
      `,

      content_en: `
Transactions group database operations into one logical unit.

PDO provides beginTransaction(), commit(), and rollBack().

If an operation fails, rollback can undo changes within the transaction. Transactions are especially useful for payments, transfers, orders, and workflows that modify multiple tables. Exact behavior depends on the database engine and transaction isolation level.
      `,

      example: `
<?php

try {
    $pdo->beginTransaction();

    $debit = $pdo->prepare(
        "UPDATE accounts
         SET balance = balance - :amount
         WHERE id = :id AND balance >= :amount"
    );

    $debit->execute([
        "amount" => 100,
        "id" => 1,
    ]);

    if ($debit->rowCount() !== 1) {
        throw new RuntimeException(
            "Debit could not be completed."
        );
    }

    $credit = $pdo->prepare(
        "UPDATE accounts
         SET balance = balance + :amount
         WHERE id = :id"
    );

    $credit->execute([
        "amount" => 100,
        "id" => 2,
    ]);

    if ($credit->rowCount() !== 1) {
        throw new RuntimeException(
            "Credit could not be completed."
        );
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    throw $e;
}
`,

      bestPractices: [
        {
          sq: "Përdor transaksione kur disa ndryshime duhet të përfundojnë së bashku.",
          en: "Use transactions when multiple changes must succeed together."
        },
        {
          sq: "Për sisteme financiare, zbato kontrolle shtesë për konkurrencën, kufizimet dhe auditimin.",
          en: "For financial systems, implement additional concurrency controls, constraints, and auditing."
        }
      ]
    },

    // =====================================================
    // 13. HTTP AND REST API DEVELOPMENT
    // =====================================================
    {
      id: "php-rest-api",
      title: "HTTP and REST API Development",
      title_sq: "HTTP dhe Zhvillimi i API-ve REST",

      content_sq: `
PHP mund të përdoret për krijimin e API-ve që komunikojnë përmes HTTP.

Metodat e zakonshme:
- GET: marrja e të dhënave.
- POST: krijimi i burimeve ose veprimeve.
- PUT: zëvendësimi i një burimi.
- PATCH: përditësimi i pjesshëm.
- DELETE: fshirja e një burimi.

Status codes të zakonshme:
- 200: OK.
- 201: Created.
- 204: No Content.
- 400: Bad Request.
- 401: Unauthorized.
- 403: Forbidden.
- 404: Not Found.
- 422: Unprocessable Content.
- 500: Internal Server Error.

API-të duhet të kenë kontrata të qarta, validim, autentikim kur nevojitet dhe përgjigje të qëndrueshme JSON.
      `,

      content_en: `
PHP can build APIs that communicate over HTTP.

Common methods include GET, POST, PUT, PATCH, and DELETE.

Common status codes include 200, 201, 204, 400, 401, 403, 404, 422, and 500.

APIs should provide clear contracts, input validation, appropriate authentication, and consistent JSON responses.
      `,

      example: `
<?php

header("Content-Type: application/json; charset=utf-8");

http_response_code(200);

echo json_encode(
    [
        "success" => true,
        "data" => [
            "service" => "XSUS AI",
            "version" => "2.0.0",
        ],
    ],
    JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
);
`,

      bestPractices: [
        {
          sq: "Përdor status codes të përshtatshme dhe mos kthe gjithmonë 200 për çdo rezultat.",
          en: "Use appropriate HTTP status codes instead of returning 200 for every outcome."
        },
        {
          sq: "Mos përfshi stack traces, fjalëkalime ose sekrete në përgjigjet e API-së.",
          en: "Do not include stack traces, passwords, or secrets in API responses."
        },
        {
          sq: "Dokumento skemat e kërkesave dhe përgjigjeve të API-së.",
          en: "Document API request and response schemas."
        }
      ]
    },

    // =====================================================
    // 14. AUTHENTICATION AND SESSION MANAGEMENT
    // =====================================================
    {
      id: "php-authentication",
      title: "Authentication, Passwords, and Sessions",
      title_sq: "Autentikimi, Fjalëkalimet dhe Sesionet",

      content_sq: `
Autentikimi verifikon identitetin e përdoruesit. Autorizimi përcakton se çfarë lejohet të bëjë ai përdorues.

PHP ofron mekanizma për sesione dhe hashimin e fjalëkalimeve:
- password_hash()
- password_verify()
- password_needs_rehash()
- session_start()
- session_regenerate_id()

Fjalëkalimet nuk duhet të ruhen kurrë në tekst të thjeshtë. Cookie-t e sesionit duhet të konfigurohen me opsione të përshtatshme Secure, HttpOnly dhe SameSite, sipas nevojave të aplikacionit.
      `,

      content_en: `
Authentication verifies a user's identity. Authorization determines what that user is allowed to do.

PHP provides password hashing and session mechanisms, including password_hash(), password_verify(), password_needs_rehash(), session_start(), and session_regenerate_id().

Passwords must never be stored in plaintext. Session cookies should use appropriate Secure, HttpOnly, and SameSite settings.
      `,

      example: `
<?php

// Regjistrimi: ruaje hash-in, jo fjalëkalimin.
$password = "example-password";

$hash = password_hash(
    $password,
    PASSWORD_DEFAULT
);

// Hyrja: verifiko fjalëkalimin kundrejt hash-it të ruajtur.
if (password_verify($password, $hash)) {
    session_start();

    // Regjenero ID-në pas autentikimit të suksesshëm.
    session_regenerate_id(true);

    $_SESSION["user_id"] = 123;
}
`,

      bestPractices: [
        {
          sq: "Përdor password_hash dhe password_verify në vend të hash-eve të përgjithshme si MD5.",
          en: "Use password_hash and password_verify instead of general-purpose hashes such as MD5."
        },
        {
          sq: "Regjenero ID-në e sesionit pas hyrjes për të zvogëluar rrezikun e session fixation.",
          en: "Regenerate the session ID after login to reduce session fixation risk."
        },
        {
          sq: "Kontrollo autorizimin në server për çdo operacion të mbrojtur.",
          en: "Enforce authorization on the server for every protected operation."
        }
      ]
    },

    // =====================================================
    // 15. SECURITY AND COMMON VULNERABILITIES
    // =====================================================
    {
      id: "php-security",
      title: "PHP Security and Common Vulnerabilities",
      title_sq: "Siguria në PHP dhe Dobësitë e Zakonshme",

      content_sq: `
Siguria duhet të jetë pjesë e çdo shtrese të aplikacionit.

Rreziqet dhe mbrojtjet:
- SQL Injection: përdor prepared statements.
- XSS: valido të dhënat dhe bëj escaping sipas kontekstit të daljes.
- CSRF: përdor token-a CSRF dhe kontrolle të përshtatshme të kërkesave.
- Session fixation: rigjenero ID-në e sesionit pas autentikimit.
- Broken access control: kontrollo lejet në server.
- Path traversal: kufizo rrugët e skedarëve te direktoritë e lejuara.
- Unsafe file uploads: kontrollo madhësinë, llojin real të skedarit dhe destinacionin.
- Secret exposure: ruaji sekretet jashtë kodit burimor.
- Insecure deserialization: shmang unserialize mbi të dhëna të pabesueshme.
- Error leakage: mos shfaq hollësi teknike në production.

Validimi, autentikimi, autorizimi dhe escaping janë mekanizma të ndryshëm dhe nuk zëvendësojnë njëri-tjetrin.
      `,

      content_en: `
Security must be considered at every application layer.

Common risks and defenses include:
- SQL injection: use prepared statements.
- XSS: validate data and escape output for its context.
- CSRF: use CSRF tokens and appropriate request checks.
- Session fixation: regenerate session IDs after authentication.
- Broken access control: enforce permissions on the server.
- Path traversal: restrict file paths to approved directories.
- Unsafe file uploads: validate size, actual file type, and destination.
- Secret exposure: keep secrets out of source code.
- Insecure deserialization: avoid unserialize on untrusted data.
- Error leakage: hide technical details in production.

Validation, authentication, authorization, and output escaping are distinct controls.
      `,

      example: `
<?php

// Escape text before rendering it into an HTML text context.
function escapeHtml(string $value): string
{
    return htmlspecialchars(
        $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        "UTF-8"
    );
}

echo escapeHtml($_GET["name"] ?? "");
`,

      bestPractices: [
        {
          sq: "Mbaj display_errors të çaktivizuar në production dhe regjistro gabimet në mënyrë të sigurt.",
          en: "Disable display_errors in production and log errors securely."
        },
        {
          sq: "Përdor mbrojtje CSRF për veprimet që ndryshojnë gjendjen dhe mbështeten në cookie sesioni.",
          en: "Use CSRF protection for state-changing actions authenticated through session cookies."
        },
        {
          sq: "Mos supozo se CORS është mekanizëm autentikimi ose autorizimi.",
          en: "Do not treat CORS as an authentication or authorization mechanism."
        }
      ]
    },

    // =====================================================
    // 16. FILE HANDLING AND UPLOADS
    // =====================================================
    {
      id: "php-file-handling",
      title: "File Handling and Upload Security",
      title_sq: "Menaxhimi i Skedarëve dhe Siguria e Ngarkimit",

      content_sq: `
PHP mund të lexojë, krijojë dhe përpunojë skedarë përmes funksioneve si file_get_contents, file_put_contents dhe fopen.

Ngarkimi i skedarëve përmes formularëve përdor zakonisht $_FILES.

Masat kryesore të sigurisë:
- Kontrollo gabimet e upload-it.
- Kufizo madhësinë.
- Verifiko llojin e skedarit me mekanizma server-side.
- Mos u mbështet vetëm te extension ose Content-Type nga klienti.
- Gjenero emra skedarësh të rinj.
- Ruaji skedarët jashtë web root kur është e mundur.
- Mos lejo ekzekutimin e skedarëve të ngarkuar.
      `,

      content_en: `
PHP can read, create, and process files using functions such as file_get_contents, file_put_contents, and fopen.

File uploads commonly use $_FILES.

Security measures include checking upload errors, limiting file size, validating file types server-side, generating new filenames, storing files outside the web root where possible, and preventing uploaded files from being executed.
      `,

      example: `
<?php

if (
    !isset($_FILES["document"]) ||
    $_FILES["document"]["error"] !== UPLOAD_ERR_OK
) {
    http_response_code(400);
    exit("Upload failed.");
}

$file = $_FILES["document"];

$maxBytes = 5 * 1024 * 1024;

if ($file["size"] > $maxBytes) {
    http_response_code(413);
    exit("File is too large.");
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file["tmp_name"]);

$allowedTypes = [
    "application/pdf" => "pdf",
];

if (!isset($allowedTypes[$mime])) {
    http_response_code(415);
    exit("Unsupported file type.");
}

$filename = bin2hex(random_bytes(16))
    . "."
    . $allowedTypes[$mime];

// $privateUploadDirectory duhet të jetë një direktori
// e konfiguruar nga serveri, jo nga përdoruesi.
$destination = $privateUploadDirectory . "/" . $filename;

if (!move_uploaded_file($file["tmp_name"], $destination)) {
    http_response_code(500);
    exit("Could not store file.");
}
`,

      bestPractices: [
        {
          sq: "Mos përdor emrin origjinal të skedarit si emër përfundimtar në server.",
          en: "Do not use the original filename as the final server-side filename."
        },
        {
          sq: "Përdor direktori të konfiguruara nga serveri dhe jo rrugë të dhëna nga klienti.",
          en: "Use server-configured directories instead of client-supplied paths."
        }
      ]
    },

    // =====================================================
    // 17. CONFIGURATION AND ENVIRONMENT
    // =====================================================
    {
      id: "php-configuration",
      title: "Configuration and Environment Variables",
      title_sq: "Konfigurimi dhe Variablat e Ambientit",

      content_sq: `
Aplikacionet duhet të ndajnë konfigurimin nga logjika e biznesit.

Konfigurimi zakonisht përfshin:
- Kredencialet e databazës.
- Çelësat e API-ve.
- Adresat e shërbimeve.
- Mjedisin application environment.
- Nivelet e logimit.
- Opsionet e cache-it.

Sekretet nuk duhet të ruhen në repository publik. Variablat e ambientit dhe menaxherët e sekreteve mund të përdoren për të furnizuar konfigurimin.

Vlerat e konfigurimit duhen validuar gjatë nisjes së aplikacionit.
      `,

      content_en: `
Applications should separate configuration from business logic.

Configuration commonly includes database credentials, API keys, service endpoints, application environment, logging levels, and cache settings.

Secrets should not be stored in public repositories. Environment variables and secret managers can provide configuration, which should be validated at application startup.
      `,

      example: `
<?php

$dbUser = getenv("DB_USER");
$dbPassword = getenv("DB_PASSWORD");

if (
    $dbUser === false ||
    $dbPassword === false ||
    $dbUser === "" ||
    $dbPassword === ""
) {
    throw new RuntimeException(
        "Required database configuration is missing."
    );
}
`,

      bestPractices: [
        {
          sq: "Përdor konfigurime të ndryshme për development, testing dhe production.",
          en: "Use separate configurations for development, testing, and production."
        },
        {
          sq: "Mos i vendos sekretet në log-e ose mesazhe gabimesh.",
          en: "Never put secrets in logs or error messages."
        }
      ]
    },

    // =====================================================
    // 18. BACKEND ARCHITECTURE AND DESIGN
    // =====================================================
    {
      id: "php-backend-architecture",
      title: "Backend Architecture and Separation of Concerns",
      title_sq: "Arkitektura Backend dhe Ndarja e Përgjegjësive",

      content_sq: `
Arkitektura backend përcakton se si organizohen pjesët e aplikacionit.

Një ndarje e zakonshme:
- Routes dhe controllers: pranojnë kërkesat HTTP.
- Services: zbatojnë logjikën e biznesit.
- Repositories: izolojnë qasjen në të dhëna kur kjo abstraksion është e dobishme.
- Models dhe entities: përfaqësojnë konceptet e domenit.
- DTOs: bartin të dhëna ndërmjet shtresave.
- Middleware: zbaton kontrolle të përbashkëta, si autentikimi.
- Configuration: ruan parametrat e ambientit.

Ndarja e përgjegjësive e bën aplikacionin më të lehtë për testim, mirëmbajtje dhe zgjerim. Struktura duhet të përputhet me kompleksitetin real të projektit.
      `,

      content_en: `
Backend architecture defines how application components are organized.

A common separation includes routes and controllers, services, repositories where useful, models and entities, DTOs, middleware, and configuration.

Separation of concerns improves testing, maintenance, and extensibility. The structure should match the actual complexity of the project.
      `,

      example: `
<?php

interface UserRepository
{
    public function findById(int $id): ?array;
}

final class UserService
{
    public function __construct(
        private UserRepository $users
    ) {}

    public function getUser(int $id): ?array
    {
        if ($id <= 0) {
            throw new InvalidArgumentException(
                "User ID must be positive."
            );
        }

        return $this->users->findById($id);
    }
}
`,

      bestPractices: [
        {
          sq: "Mos e vendos të gjithë logjikën e biznesit brenda controller-ave.",
          en: "Do not place all business logic inside controllers."
        },
        {
          sq: "Përdor dependency injection për të ulur lidhjen e fortë ndërmjet komponentëve.",
          en: "Use dependency injection to reduce tight coupling between components."
        },
        {
          sq: "Mos krijo abstraksione të panevojshme për funksionalitete shumë të thjeshta.",
          en: "Avoid unnecessary abstractions for very simple functionality."
        }
      ]
    },

    // =====================================================
    // 19. TESTING AND CODE QUALITY
    // =====================================================
    {
      id: "php-testing",
      title: "Testing, Debugging, and Code Quality",
      title_sq: "Testimi, Debugging dhe Cilësia e Kodit",

      content_sq: `
Testimi ndihmon në verifikimin e sjelljes së aplikacionit dhe në parandalimin e regresioneve.

Llojet kryesore:
- Unit tests: testojnë njësi të vogla të logjikës.
- Integration tests: testojnë bashkëveprimin me databazën ose shërbime të tjera.
- Feature tests: testojnë sjelljen e funksionaliteteve.
- End-to-end tests: testojnë rrjedha të plota.
- Static analysis: identifikon probleme të mundshme pa ekzekutuar aplikacionin.
- Coding standards: ruajnë stil të qëndrueshëm.

PHPUnit është një mjet i përdorur gjerësisht për testim. PHPStan dhe Psalm përdoren për analizë statike.
      `,

      content_en: `
Testing verifies application behavior and helps prevent regressions.

Common types include unit tests, integration tests, feature tests, end-to-end tests, static analysis, and coding-standard checks.

PHPUnit is widely used for testing. PHPStan and Psalm are tools for static analysis.
      `,

      example: `
<?php

use PHPUnit\\Framework\\TestCase;

final class PriceCalculatorTest extends TestCase
{
    public function testCalculatesTotal(): void
    {
        $price = 12.50;
        $quantity = 4;

        $total = $price * $quantity;

        self::assertSame(50.0, $total);
    }
}
`,

      bestPractices: [
        {
          sq: "Testo rastet normale, rastet kufitare dhe dështimet e pritshme.",
          en: "Test normal cases, edge cases, and expected failures."
        },
        {
          sq: "Mbaji testet të përsëritshme dhe të pavarura nga të dhënat reale të production.",
          en: "Keep tests reproducible and independent of real production data."
        },
        {
          sq: "Përdor analiza statike në CI për të zbuluar probleme herët.",
          en: "Use static analysis in CI to detect problems early."
        }
      ]
    },

    // =====================================================
    // 20. CACHING AND PERFORMANCE
    // =====================================================
    {
      id: "php-performance",
      title: "Caching and Performance Optimization",
      title_sq: "Cache dhe Optimizimi i Performancës",

      content_sq: `
Performanca duhet të përmirësohet duke u bazuar në matje.

Teknikat kryesore:
- OPcache për cache të bytecode-it PHP.
- Cache për rezultate të kushtueshme.
- Indekse të përshtatshme në databazë.
- Shmangia e kërkesave të panevojshme.
- Paginimi i koleksioneve të mëdha.
- Përdorimi i streaming ose generators për të dhëna të mëdha.
- Profilizimi për të identifikuar pengesat.

Cache duhet të ketë strategji të qartë skadimi dhe invalidimi. Të dhënat private nuk duhet të ndahen mes përdoruesve përmes një cache të konfiguruar gabimisht.
      `,

      content_en: `
Performance should be improved based on measurements.

Common techniques include OPcache, caching expensive results, appropriate database indexes, avoiding unnecessary queries, paginating large collections, streaming large datasets, and profiling bottlenecks.

Caches need clear expiration and invalidation strategies. Private data must not leak across users through incorrectly configured caching.
      `,

      example: `
<?php

// Shembull konceptual i cache-it.
// $cache është një implementim i injektuar nga aplikacioni.

$key = "catalog:featured";

$products = $cache->get($key);

if ($products === null) {
    $products = $productRepository->getFeaturedProducts();

    $cache->set($key, $products, 300);
}
`,

      bestPractices: [
        {
          sq: "Mat performancën para se të optimizosh.",
          en: "Measure performance before optimizing."
        },
        {
          sq: "Përcakto kur dhe si invalidizohet secila kategori e të dhënave të cache-uara.",
          en: "Define when and how each category of cached data is invalidated."
        }
      ]
    },

    // =====================================================
    // 21. LOGGING AND MONITORING
    // =====================================================
    {
      id: "php-logging-monitoring",
      title: "Logging, Monitoring, and Production Readiness",
      title_sq: "Logimi, Monitorimi dhe Gatishmëria për Production",

      content_sq: `
Logimi dhe monitorimi ndihmojnë në zbulimin dhe diagnostikimin e problemeve.

Një aplikacion production duhet të ketë:
- Log-e të strukturuara.
- Nivele logimi, si debug, info, warning dhe error.
- Identifikues kërkesash për gjurmimin e problemeve.
- Monitorim të gabimeve dhe performancës.
- Kontroll të qasjes në log-e.
- Politika për ruajtjen dhe fshirjen e tyre.

Mos regjistro fjalëkalime, token-a autentikimi, çelësa privatë ose të dhëna personale të panevojshme.
      `,

      content_en: `
Logging and monitoring help detect and diagnose problems.

Production applications should have structured logs, logging levels, request identifiers, error and performance monitoring, access controls, and log-retention policies.

Never log passwords, authentication tokens, private keys, or unnecessary personal data.
      `,

      example: `
<?php

// $logger përfaqëson një logger të injektuar nga aplikacioni.

try {
    $result = $service->execute();
} catch (Throwable $e) {
    $logger->error("Service execution failed", [
        "exception" => get_class($e),
        "request_id" => $requestId,
    ]);

    http_response_code(500);

    echo json_encode([
        "error" => "Internal server error",
        "request_id" => $requestId,
    ]);
}
`,

      bestPractices: [
        {
          sq: "Përdor një bibliotekë logimi dhe mos krijo një sistem të papërpunuar për çdo skedar.",
          en: "Use a logging library rather than inventing an ad hoc system for every file."
        },
        {
          sq: "Ndaji mesazhet që shfaqen te përdoruesi nga detajet teknike të log-eve.",
          en: "Separate user-facing messages from technical log details."
        }
      ]
    },

    // =====================================================
    // 22. DEPLOYMENT AND ENVIRONMENTS
    // =====================================================
    {
      id: "php-deployment",
      title: "Deployment and Environment Management",
      title_sq: "Publikimi dhe Menaxhimi i Mjediseve",

      content_sq: `
Publikimi i aplikacionit PHP kërkon një proces të kontrolluar.

Hapat e zakonshëm:
- Instalimi i versionit të duhur PHP dhe extensions.
- Instalimi i varësive me Composer.
- Konfigurimi i variablave të ambientit.
- Ekzekutimi i migrimeve të databazës.
- Konfigurimi i web server-it.
- Aktivizimi i HTTPS.
- Konfigurimi i logimit dhe monitorimit.
- Ekzekutimi i testeve dhe kontrolleve shëndetësore.

Document root duhet të drejtohet te direktoria publike e aplikacionit, zakonisht public/, dhe jo te e gjithë struktura e projektit.
      `,

      content_en: `
Deploying a PHP application requires a controlled process.

Typical steps include installing the required PHP version and extensions, installing Composer dependencies, configuring environment variables, running database migrations, configuring the web server, enabling HTTPS, setting up logging and monitoring, and running tests and health checks.

The document root should point to the application's public directory, commonly public/, rather than exposing the entire project.
      `,

      example: `
# Shembull i rrjedhës së publikimit

composer install --no-dev --prefer-dist --optimize-autoloader

# Ekzekuto testet dhe kontrollet e projektit
# Ekzekuto migrimet përmes mjetit të projektit
# Verifiko konfigurimin dhe health checks
`,

      bestPractices: [
        {
          sq: "Mos e publiko skedarin .env ose direktorinë vendor si përmbajtje publike.",
          en: "Do not expose the .env file or the vendor directory as public content."
        },
        {
          sq: "Përdor një proces deployment të përsëritshëm dhe me mundësi rikthimi.",
          en: "Use a repeatable deployment process with a rollback strategy."
        }
      ]
    },

    // =====================================================
    // 23. MODERN PHP AND CODING STANDARDS
    // =====================================================
    {
      id: "modern-php",
      title: "Modern PHP and Coding Standards",
      title_sq: "PHP Moderne dhe Standardet e Kodimit",

      content_sq: `
PHP moderne ofron veçori që ndihmojnë në krijimin e kodit më të qartë dhe më të sigurt.

Veçori të rëndësishme, sipas versionit:
- Type declarations dhe return types.
- Nullable dhe union types.
- Arrow functions.
- Match expressions.
- Named arguments.
- Constructor property promotion.
- Attributes.
- Enums.
- Readonly properties dhe classes në versionet përkatëse.
- Fibers për modele të caktuara të ekzekutimit bashkëpunues.

PSR-12 përdoret gjerësisht për stilin e kodit. Veçoritë duhet të përdoren vetëm kur versioni minimal i PHP-së i mbështet.
      `,

      content_en: `
Modern PHP offers features that help produce clearer and safer code.

Important features, depending on the PHP version, include type declarations, nullable and union types, arrow functions, match expressions, named arguments, constructor property promotion, attributes, enums, readonly properties and classes, and fibers.

PSR-12 is widely used for coding style. Features must be compatible with the project's minimum PHP version.
      `,

      example: `
<?php

enum OrderStatus: string
{
    case Pending = "pending";
    case Paid = "paid";
    case Cancelled = "cancelled";
}

function getStatusLabel(OrderStatus $status): string
{
    return match ($status) {
        OrderStatus::Pending => "Waiting for payment",
        OrderStatus::Paid => "Paid",
        OrderStatus::Cancelled => "Cancelled",
    };
}
`,

      bestPractices: [
        {
          sq: "Përcakto versionin minimal të PHP-së në projekt dhe testoje kundrejt tij.",
          en: "Define the project's minimum PHP version and test against it."
        },
        {
          sq: "Përdor formatter dhe coding standards për të ruajtur konsistencën.",
          en: "Use a formatter and coding standards to maintain consistency."
        }
      ]
    },

    // =====================================================
    // 24. PHP GLOSSARY
    // =====================================================
    {
      id: "php-glossary",
      title: "PHP and Backend Development Glossary",
      title_sq: "Fjalorthi i PHP dhe Zhvillimit Backend",

      terms: [
        {
          term: "PHP",
          definition_sq:
            "Gjuhë programimi e përdorur gjerësisht për zhvillimin në anën e serverit.",
          definition_en:
            "A programming language widely used for server-side development."
        },
        {
          term: "PDO",
          definition_sq:
            "Ndërfaqe e PHP-së për komunikimin me databaza përmes drejtuesve përkatës.",
          definition_en:
            "PHP interface for accessing databases through database drivers."
        },
        {
          term: "Prepared Statement",
          definition_sq:
            "Pyetje SQL me parametra të lidhur veçmas për të ndarë kodin SQL nga vlerat.",
          definition_en:
            "An SQL statement with separately bound parameters, separating SQL code from values."
        },
        {
          term: "Composer",
          definition_sq:
            "Menaxhuesi i varësive dhe paketave për PHP.",
          definition_en:
            "The dependency and package manager for PHP."
        },
        {
          term: "Namespace",
          definition_sq:
            "Mekanizëm për organizimin e emrave të klasave, ndërfaqeve, funksioneve dhe konstanteve.",
          definition_en:
            "A mechanism for organizing class, interface, function, and constant names."
        },
        {
          term: "Autoloading",
          definition_sq:
            "Ngarkimi automatik i klasave kur ato nevojiten.",
          definition_en:
            "Automatically loading classes when they are needed."
        },
        {
          term: "OOP",
          definition_sq:
            "Paradigmë programimi e bazuar në objekte dhe klasa.",
          definition_en:
            "A programming paradigm based on objects and classes."
        },
        {
          term: "API",
          definition_sq:
            "Ndërfaqe që u mundëson sistemeve softuerike të komunikojnë.",
          definition_en:
            "An interface that allows software systems to communicate."
        },
        {
          term: "REST",
          definition_sq:
            "Stil arkitekturor që përdoret shpesh për projektimin e API-ve web.",
          definition_en:
            "An architectural style commonly used to design web APIs."
        },
        {
          term: "Authentication",
          definition_sq:
            "Procesi i verifikimit të identitetit të përdoruesit.",
          definition_en:
            "The process of verifying a user's identity."
        },
        {
          term: "Authorization",
          definition_sq:
            "Procesi i përcaktimit të veprimeve që një përdorues lejohet të kryejë.",
          definition_en:
            "The process of determining which actions a user is allowed to perform."
        },
        {
          term: "CSRF",
          definition_sq:
            "Sulm që mund ta nxisë shfletuesin e autentikuar të kryejë veprime të padëshiruara.",
          definition_en:
            "An attack that can trick an authenticated browser into performing unwanted actions."
        },
        {
          term: "XSS",
          definition_sq:
            "Dobësi që lejon injektimin e skripteve të ekzekutueshme në përmbajtjen e shfaqur.",
          definition_en:
            "A vulnerability that allows executable scripts to be injected into displayed content."
        },
        {
          term: "SQL Injection",
          definition_sq:
            "Dobësi që lind kur inputi ndikon në strukturën e një pyetjeje SQL.",
          definition_en:
            "A vulnerability that occurs when input alters the structure of an SQL query."
        },
        {
          term: "Dependency Injection",
          definition_sq:
            "Teknikë ku varësitë i jepen një komponenti nga jashtë, në vend që ai t'i krijojë vetë.",
          definition_en:
            "A technique in which dependencies are supplied to a component from outside rather than created internally."
        },
        {
          term: "DTO",
          definition_sq:
            "Objekt për bartjen e të dhënave ndërmjet shtresave ose sistemeve.",
          definition_en:
            "An object used to transfer data between layers or systems."
        },
        {
          term: "OPcache",
          definition_sq:
            "Mekanizëm cache që ruan bytecode-in e përpiluar të PHP-së për të reduktuar përpunimin e përsëritur.",
          definition_en:
            "A cache that stores compiled PHP bytecode to reduce repeated processing."
        },
        {
          term: "PSR-4",
          definition_sq:
            "Standard për lidhjen e namespaces me rrugët e skedarëve gjatë autoloading.",
          definition_en:
            "A standard for mapping namespaces to file paths during autoloading."
        },
        {
          term: "Transaction",
          definition_sq:
            "Grup operacionesh databaze që trajtohen si një njësi logjike.",
          definition_en:
            "A group of database operations treated as one logical unit."
        },
        {
          term: "Environment Variable",
          definition_sq:
            "Vlerë konfigurimi e ofruar nga ambienti ku ekzekutohet aplikacioni.",
          definition_en:
            "A configuration value supplied by the application's runtime environment."
        }
      ]
    }
  ]
};

// ============================================================================
// EXPORT COMPATIBILITY
// ============================================================================

// ES Modules / TypeScript:
// import { phpFundamentalsKnowledge } from "./phpFundamentalsKnowledge";

// CommonJS:
// module.exports = phpFundamentalsKnowledge;
//
// Mos e kombino export const me module.exports nëse projekti nuk e mbështet
// shprehimisht këtë konfigurim. Zgjidh formatin e eksportimit sipas projektit.
