// ============================================================================
// XSUS AI - JAVA & ENTERPRISE ARCHITECTURE MASTER KNOWLEDGE BASE
// Version: 3.0.0 (Professional Bilingual Structured Engine)
// ============================================================================

export const javaKnowledge = {
  id: "xsus-java-professional",
  title: "XSUS AI - Java & Enterprise Architecture Professional Knowledge Base",
  title_sq: "XSUS AI - Baza Profesionale e Njohurive për Java dhe Arkitekturën Enterprise",
  description:
    "Professional bilingual knowledge base covering modern Java, JVM, OOP, SOLID, Generics, Collections, Streams, concurrency, testing, Spring Boot, REST APIs, persistence, security, and enterprise architecture.",
  description_sq:
    "Baza profesionale dygjuhëshe që mbulon Java moderne, JVM, OOP, SOLID, Generics, Collections, Streams, konkurrencën, testimin, Spring Boot, REST API, databazat, sigurinë dhe arkitekturën enterprise.",
  version: "3.0.0",
  language: ["sq", "en"],

  sections: [
    // ============================================================
    // 1. JAVA PLATFORM AND JVM ARCHITECTURE
    // ============================================================
    {
      id: "java-jvm-architecture",
      title: "Java Platform and JVM Architecture",
      title_sq: "Platforma Java dhe Arkitektura e JVM",

      content_sq: `
Java është gjuhë e tipizuar statikisht, me mbështetje të fortë për programimin e orientuar nga objektet, programimin funksional dhe zhvillimin e aplikacioneve enterprise.

Përbërësit kryesorë:
- JDK (Java Development Kit): mjetet e zhvillimit, përfshirë kompiluesin javac.
- JVM (Java Virtual Machine): ekzekuton Java bytecode.
- Bytecode: përfaqësim ndërmjetës i prodhuar nga kompilimi i kodit Java.
- JIT Compiler: optimizon pjesë të kodit gjatë ekzekutimit.
- Garbage Collector: rikuperon memorien e objekteve që nuk janë më të arritshme.

Zona të rëndësishme të memories:
- Heap: zakonisht ruan objektet dhe vargjet.
- Java stacks: mbajnë kornizat e thirrjeve të metodave dhe variablat lokale.
- Metaspace: ruan metadata të klasave në implementimet moderne të HotSpot JVM.

Analizë:
JVM ekzekuton bytecode përmes interpretimit dhe/ose kompilimit JIT. Java ofron portabilitet të lartë, por sjellja, performanca dhe disponueshmëria e veçorive mund të varen nga versioni i JDK-së dhe konfigurimi i mjedisit.
`,

      content_en: `
Java is a statically typed language with strong support for object-oriented programming, functional programming, and enterprise application development.

Core components:
- JDK: development tools, including javac.
- JVM: executes Java bytecode.
- Bytecode: an intermediate representation produced by compiling Java source.
- JIT compiler: optimizes parts of the program at runtime.
- Garbage collector: reclaims memory from objects that are no longer reachable.

Important memory areas include the heap, Java thread stacks, and Metaspace in modern HotSpot JVM implementations.

Analysis:
The JVM executes bytecode through interpretation and/or JIT compilation. Java provides portability, although behavior, performance, and feature availability can depend on the JDK version and runtime configuration.
`,

      example: `
public class Main {
    public static void main(String[] args) {
        System.out.println("XSUS AI - Java Platform");

        Runtime runtime = Runtime.getRuntime();

        System.out.println(
            "Processors available: " +
            runtime.availableProcessors()
        );
    }
}
`,

      analysis: [
        {
          sq: "Kodi burimor Java zakonisht kompilohen në bytecode përpara ekzekutimit.",
          en: "Java source code is typically compiled into bytecode before execution."
        },
        {
          sq: "Garbage Collector nuk garanton lirimin e menjëhershëm të memories.",
          en: "The garbage collector does not guarantee immediate memory reclamation."
        },
        {
          sq: "Portabiliteti varet edhe nga bibliotekat, konfigurimi dhe veçoritë e platformës.",
          en: "Portability also depends on libraries, configuration, and platform-specific features."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor versione të mbështetura të JDK-së dhe dokumento versionin e synuar.",
          en: "Use supported JDK releases and document the target version."
        },
        {
          sq: "Mat performancën me mjete profilizimi para optimizimit.",
          en: "Profile performance before optimizing."
        }
      ]
    },

    // ============================================================
    // 2. JAVA SYNTAX, TYPES, AND CONTROL FLOW
    // ============================================================
    {
      id: "java-syntax-types-control-flow",
      title: "Java Syntax, Types, and Control Flow",
      title_sq: "Sintaksa, Tipet dhe Rrjedha e Kontrollit në Java",

      content_sq: `
Java është gjuhë e tipizuar statikisht: tipi i një variabli kontrollohet nga kompiluesi.

Tipet primitive:
- byte, short, int, long
- float, double
- char
- boolean

Tipet reference përfshijnë klasat, ndërfaqet, vargjet dhe arrays.

Konceptet bazë:
- Deklarimi dhe inicializimi i variablave.
- Kushtet if/else dhe switch.
- Ciklet for, enhanced for, while dhe do-while.
- Fjalët kyçe break dhe continue.
- Konvertimet implicite dhe explicite të tipeve.

Analizë:
Për krahasimin e vlerave primitive përdoren operatorët përkatës. Për objektet, == zakonisht krahason identitetin e referencës, ndërsa equals() mund të krahasojë përmbajtjen, në varësi të implementimit të klasës.
`,

      content_en: `
Java is statically typed: variable types are checked by the compiler.

Primitive types include byte, short, int, long, float, double, char, and boolean. Reference types include classes, interfaces, arrays, and other object references.

Core concepts include variable declarations, conditions, loops, switch expressions/statements, and type conversions.

Analysis:
For primitive values, use the appropriate value operators. For objects, == normally compares reference identity, while equals() may compare logical equality depending on the class implementation.
`,

      example: `
public class TypesExample {
    public static void main(String[] args) {
        int age = 25;
        double balance = 125.50;
        boolean active = true;
        String name = "XSUS AI";

        if (active && age >= 18) {
            System.out.println(name + " is active");
        }

        for (int i = 0; i < 3; i++) {
            System.out.println("Iteration: " + i);
        }

        System.out.println("Balance: " + balance);
    }
}
`,

      analysis: [
        {
          sq: "Variablat lokale duhet të inicializohen para përdorimit.",
          en: "Local variables must be initialized before use."
        },
        {
          sq: "String është objekt dhe nuk është tip primitiv.",
          en: "String is an object type, not a primitive type."
        },
        {
          sq: "Përdor equals() kur kërkohet krahasim logjik i objekteve.",
          en: "Use equals() when logical object equality is required."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor emra domethënës për variablat dhe metodat.",
          en: "Use meaningful variable and method names."
        },
        {
          sq: "Shmang konvertimet e tipeve që mund të humbin informacion pa kontroll.",
          en: "Avoid unchecked conversions that may lose information."
        }
      ]
    },

    // ============================================================
    // 3. OBJECT-ORIENTED PROGRAMMING
    // ============================================================
    {
      id: "java-oop-principles",
      title: "Object-Oriented Programming Principles",
      title_sq: "Parimet e Programimit të Orientuar nga Objektet",

      content_sq: `
Katër shtyllat e OOP janë:

1. Encapsulation: mbron gjendjen e brendshme dhe ekspozon operacione të kontrolluara.
2. Inheritance: lejon një klasë të trashëgojë sjellje nga një klasë tjetër.
3. Polymorphism: lejon përdorimin e një kontrate të përbashkët me implementime të ndryshme.
4. Abstraction: fsheh detajet e panevojshme të implementimit.

Java mbështet trashëgimi të vetme të klasave, por një klasë mund të implementojë disa interfaces.

Analizë:
Kompozimi shpesh është më fleksibël se trashëgimia, veçanërisht kur sjellja mund të ndryshojë në kohë ekzekutimi. Interfaces ndihmojnë në ndarjen e kontratave nga implementimet konkrete.
`,

      content_en: `
The four OOP pillars are encapsulation, inheritance, polymorphism, and abstraction.

Java supports single class inheritance, while a class may implement multiple interfaces.

Analysis:
Composition is often more flexible than inheritance, especially when behavior must vary at runtime. Interfaces help separate contracts from concrete implementations.
`,

      example: `
interface NotificationService {
    void send(String recipient, String message);
}

final class EmailNotificationService
        implements NotificationService {

    @Override
    public void send(String recipient, String message) {
        System.out.println(
            "Sending email to " + recipient + ": " + message
        );
    }
}

public class OopExample {
    public static void main(String[] args) {
        NotificationService service =
            new EmailNotificationService();

        service.send("user@example.com", "Welcome!");
    }
}
`,

      analysis: [
        {
          sq: "Variabla përdor një interface, jo domosdoshmërisht klasën konkrete.",
          en: "The variable uses an interface rather than requiring a concrete class."
        },
        {
          sq: "@Override ndihmon kompiluesin të kontrollojë mbivendosjen e metodës.",
          en: "@Override helps the compiler verify method overriding."
        },
        {
          sq: "Implementimi mund të zëvendësohet pa ndryshuar kodin që përdor kontratën.",
          en: "The implementation can be replaced without changing code that uses the contract."
        }
      ],

      bestPractices: [
        {
          sq: "Prefero kompozimin kur marrëdhënia nuk është vërtet një marrëdhënie 'is-a'.",
          en: "Prefer composition when the relationship is not truly an 'is-a' relationship."
        },
        {
          sq: "Mbaj fushat private dhe ekspozo vetëm operacionet e nevojshme.",
          en: "Keep fields private and expose only necessary operations."
        }
      ]
    },

    // ============================================================
    // 4. SOLID DESIGN PRINCIPLES
    // ============================================================
    {
      id: "java-solid-principles",
      title: "SOLID Design Principles",
      title_sq: "Parimet e Dizajnit SOLID",

      content_sq: `
SOLID është një grup parimesh që ndihmojnë në krijimin e sistemeve të mirëmbajtshme.

- S — Single Responsibility Principle: një modul duhet të ketë një përgjegjësi të qartë.
- O — Open/Closed Principle: kodi duhet të jetë i hapur për zgjerim dhe i mbyllur ndaj ndryshimeve të panevojshme.
- L — Liskov Substitution Principle: implementimet zëvendësuese duhet të ruajnë kontratën e tipit bazë.
- I — Interface Segregation Principle: prefero interfaces të vogla dhe të fokusuara.
- D — Dependency Inversion Principle: modulet e nivelit të lartë duhet të varen nga abstraksionet.

Analizë:
SOLID nuk është një listë rregullash mekanike. Aplikimi i tij duhet të zvogëlojë kompleksitetin dhe të përmirësojë testueshmërinë, jo të krijojë shtresa të panevojshme abstraksioni.
`,

      content_en: `
SOLID is a set of design principles that help create maintainable systems.

- Single Responsibility: a module should have a clear responsibility.
- Open/Closed: code should be open for extension and closed to unnecessary modification.
- Liskov Substitution: replacements must preserve the base type's contract.
- Interface Segregation: prefer small, focused interfaces.
- Dependency Inversion: high-level modules should depend on abstractions.

Analysis:
SOLID is not a mechanical checklist. Apply it when it reduces complexity and improves testability rather than creating unnecessary abstraction layers.
`,

      example: `
interface PaymentGateway {
    boolean charge(long amountInCents);
}

final class CheckoutService {
    private final PaymentGateway paymentGateway;

    CheckoutService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }

    boolean checkout(long amountInCents) {
        if (amountInCents <= 0) {
            throw new IllegalArgumentException(
                "Amount must be positive"
            );
        }

        return paymentGateway.charge(amountInCents);
    }
}
`,

      analysis: [
        {
          sq: "CheckoutService varet nga interface PaymentGateway dhe jo nga një provider specifik.",
          en: "CheckoutService depends on PaymentGateway rather than a specific provider."
        },
        {
          sq: "Varësia injektohet përmes konstruktorit, gjë që lehtëson testimin.",
          en: "The dependency is injected through the constructor, improving testability."
        },
        {
          sq: "Validimi i shumës mbron invariantet e shërbimit.",
          en: "Amount validation protects the service's invariants."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor constructor injection për varësitë e detyrueshme.",
          en: "Use constructor injection for required dependencies."
        },
        {
          sq: "Mos krijo interfaces pa një nevojë reale për abstraksion.",
          en: "Do not create interfaces without a real need for abstraction."
        }
      ]
    },
