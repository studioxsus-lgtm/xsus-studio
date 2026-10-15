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
• JDK (Java Development Kit): mjetet e zhvillimit, përfshirë kompiluesin javac.
• JVM (Java Virtual Machine): ekzekuton Java bytecode.
• Bytecode: përfaqësim ndërmjetës i prodhuar nga kompilimi i kodit Java.
• JIT Compiler: optimizon pjesë të kodit gjatë ekzekutimit.
• Garbage Collector: rikuperon memorien e objekteve që nuk janë më të arritshme.

Zona të rëndësishme të memories:
• Heap: zakonisht ruan objektet dhe vargjet.
• Java stacks: mbajnë kornizat e thirrjeve të metodave dhe variablat lokale.
• Metaspace: ruan metadata të klasave në implementimet moderne të HotSpot JVM.

Analizë:
JVM ekzekuton bytecode përmes interpretimit dhe/ose kompilimit JIT. Java ofron portabilitet të lartë, por sjellja, performanca dhe disponueshmëria e veçorive mund të varen nga versioni i JDK-së dhe konfigurimi i mjedisit.
`,
      content_en: `
Java is a statically typed language with strong support for object-oriented programming, functional programming, and enterprise application development.

Core components:
• JDK: development tools, including javac.
• JVM: executes Java bytecode.
• Bytecode: an intermediate representation produced by compiling Java source.
• JIT compiler: optimizes parts of the program at runtime.
• Garbage collector: reclaims memory from objects that are no longer reachable.

Important memory areas include the heap, Java thread stacks, and Metaspace in modern HotSpot JVM implementations.

Analysis:
The JVM executes bytecode through interpretation and/or JIT compilation. Java provides portability, although behavior, performance, and feature availability can depend on the JDK version and runtime configuration.
`,
      example: `
public class Main {
    public static void main(String[] args) {
        System.out.println("XSUS AI - Java Platform");
        Runtime runtime = Runtime.getRuntime();
        System.out.println("Processors available: " + runtime.availableProcessors());
    }
}
`,
      analysis: [
        {
          sq: "Kodi burimor Java zakonisht kompilohet në bytecode përpara ekzekutimit.",
          en: "Java source code is typically compiled into bytecode before execution."
        },
        {
          sq: "Garbage Collector nuk garanton lirimin e menjëhershëm të memories.",
          en: "The garbage collector does not guarantee immediate memory reclamation."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor versione të mbështetura të JDK-së dhe dokumento versionin e synuar.",
          en: "Use supported JDK releases and document the target version."
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
Tipet primitive: byte, short, int, long, float, double, char, boolean.
Tipet reference: klasat, ndërfaqet, vargjet.
`,
      content_en: `
Java is statically typed: variable types are checked by the compiler.
Primitives include byte, short, int, long, float, double, char, boolean. Reference types include classes, interfaces, and arrays.
`,
      example: `
public class TypesExample {
    public static void main(String[] args) {
        int age = 25;
        String name = "XSUS AI";
        System.out.println(name + " age: " + age);
    }
}
`,
      analysis: [
        {
          sq: "Variablat lokale duhet të inicializohen para përdorimit.",
          en: "Local variables must be initialized before use."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor emra domethënës për variablat dhe metodat.",
          en: "Use meaningful variable and method names."
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
Katër shtyllat e OOP janë: Encapsulation, Inheritance, Polymorphism dhe Abstraction.
`,
      content_en: `
The four OOP pillars are encapsulation, inheritance, polymorphism, and abstraction.
`,
      example: `
interface Service {
    void execute();
}
class MyService implements Service {
    @Override public void execute() { System.out.println("Running"); }
}
`,
      analysis: [
        {
          sq: "@Override ndihmon kompiluesin të verifikojë mbivendosjen.",
          en: "@Override helps the compiler verify method overriding."
        }
      ],
      bestPractices: [
        {
          sq: "Prefero kompozimin kur marrëdhënia nuk është 'is-a'.",
          en: "Prefer composition when the relationship is not truly 'is-a'."
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
SOLID mbulon pesë parimet kryesore: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, dhe Dependency Inversion.
`,
      content_en: `
SOLID covers five core principles: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion.
`,
      example: `
interface Sender { void send(String msg); }
`,
      analysis: [
        {
          sq: "Dependency Inversion ndihmon në zvogëlimin e lidhjes së fortë.",
          en: "Dependency inversion helps reduce tight coupling."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor constructor injection për varësitë e detyrueshme.",
          en: "Use constructor injection for required dependencies."
        }
      ]
    },

    // ============================================================
    // 5. GENERICS AND TYPE SAFETY
    // ============================================================
    {
      id: "java-generics",
      title: "Generics and Type Safety",
      title_sq: "Generics dhe Siguria e Tipave",
      content_sq: `
Generics ofrojnë siguri tipesh gjatë kompilimit. Zbatojnë parimin PECS (Producer Extends, Consumer Super).
`,
      content_en: `
Generics provide compile-time type safety. They follow the PECS principle (Producer Extends, Consumer Super).
`,
      example: `
class Box<T> { private T val; Box(T v) { val = v; } T get() { return val; } }
`,
      analysis: [
        {
          sq: "Generics shmangin cast-et e panevojshme.",
          en: "Generics avoid unnecessary casts."
        }
      ],
      bestPractices: [
        {
          sq: "Prefero Generics ndaj tipeve raw.",
          en: "Prefer generics over raw types."
        }
      ]
    },

    // ============================================================
    // 6. COLLECTIONS FRAMEWORK
    // ============================================================
    {
      id: "java-collections",
      title: "Java Collections Framework",
      title_sq: "Java Collections Framework",
      content_sq: `
Ofron struktura të gatshme si List, Set, Queue, Deque, dhe Map (ArrayList, HashSet, HashMap, etj.).
`,
      content_en: `
Provides ready-made data structures like List, Set, Queue, Deque, and Map.
`,
      example: `
List<String> list = new java.util.ArrayList<>();
`,
      analysis: [
        {
          sq: "Zgjidh koleksionin e duhur sipas kompleksitetit kohor.",
          en: "Choose the correct collection based on time complexity."
        }
      ],
      bestPractices: [
        {
          sq: "Deklaro variablat përmes ndërfaqeve (List, Map).",
          en: "Declare variables using interfaces (List, Map)."
        }
      ]
    },

    // ============================================================
    // 7. STREAMS AND LAMBDA EXPRESSIONS
    // ============================================================
    {
      id: "java-streams-lambdas",
      title: "Streams API and Lambda Expressions",
      title_sq: "Streams API dhe Shprehjet Lambda",
      content_sq: `
Përpunim deklarativ i të dhënave përmes operacioneve intermediate dhe terminale.
`,
      content_en: `
Declarative data processing through intermediate and terminal operations.
`,
      example: `
List.of("a", "b").stream().map(String::toUpperCase).toList();
`,
      analysis: [
        {
          sq: "Stream-et janë lazy dhe nuk modifikojnë burimin origjinal.",
          en: "Streams are lazy and do not modify the original source."
        }
      ],
      bestPractices: [
        {
          sq: "Shmang efektet anësore brenda lambdave.",
          en: "Avoid side effects inside lambdas."
        }
      ]
    },

    // ============================================================
    // 8. OPTIONAL AND NULL SAFETY
    // ============================================================
    {
      id: "java-optional-null-safety",
      title: "Optional and Null-Safety",
      title_sq: "Optional dhe Siguria ndaj Null",
      content_sq: `
Optional<T> modelon vlerat që mund të mungojnë, duke shmangur NullPointerException.
`,
      content_en: `
Optional<T> models potentially absent values, helping avoid NullPointerException.
`,
      example: `
Optional.ofNullable(val).orElse("default");
`,
      analysis: [
        {
          sq: "Përdoret kryesisht si tip kthimi në metoda.",
          en: "Primarily used as a method return type."
        }
      ],
      bestPractices: [
        {
          sq: "Mos thirr get() pa kontrolluar praninë e vlerës.",
          en: "Do not call get() without checking presence."
        }
      ]
    },

    // ============================================================
    // 9. EXCEPTION HANDLING
    // ============================================================
    {
      id: "java-exception-handling",
      title: "Exception Handling",
      title_sq: "Menaxhimi i Gabimeve dhe Përjashtimeve",
      content_sq: `
Menaxhimi i gabimeve përmes checked/unchecked exceptions dhe try-with-resources.
`,
      content_en: `
Error management via checked/unchecked exceptions and try-with-resources.
`,
      example: `
try (var reader = Files.newBufferedReader(path)) { ... }
`,
      analysis: [
        {
          sq: "Përdor try-with-resources për mbylljen e sigurt të burimeve.",
          en: "Use try-with-resources for safe resource closure."
        }
      ],
      bestPractices: [
        {
          sq: "Kap exceptions specifike dhe shmang catch gjenerik pa arsye.",
          en: "Catch specific exceptions and avoid generic catch blocks."
        }
      ]
    },

    // ============================================================
    // 10. CUSTOM EXCEPTIONS
    // ============================================================
    {
      id: "java-custom-exceptions",
      title: "Custom Exceptions",
      title_sq: "Exceptions të Personalizuara",
      content_sq: `Krijimi i exception-ve të personalizuara për gabime të domenit të biznesit.`,
      content_en: `Creating custom exceptions for business domain failures.`,
      example: `class CustomEx extends RuntimeException { public CustomEx(String m) { super(m); } }`,
      analysis: [
        {
          sq: "Ndihmojnë në dallimin e gabimeve të biznesit nga ato teknike.",
          en: "Help distinguish business failures from technical errors."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor emra që tregojnë qartë situatën e dështimit.",
          en: "Use clear failure-describing names."
        }
      ]
    },

    // ============================================================
    // 11. FILE I/O AND NIO.2
    // ============================================================
    {
      id: "java-file-io",
      title: "File I/O and NIO.2",
      title_sq: "Leximi dhe Shkrimi i Skedarëve",
      content_sq: `Përdorimi i Path dhe Files për menaxhimin e skedarëve në Java.`,
      content_en: `Using Path and Files for file management in Java.`,
      example: `Files.writeString(Path.of("test.txt"), "content");`,
      analysis: [
        {
          sq: "Përdor try-with-resources për menaxhimin e burimeve I/O.",
          en: "Use try-with-resources for managing I/O resources."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor kodim UTF-8 në mënyrë eksplicite.",
          en: "Explicitly use UTF-8 encoding."
        }
      ]
    },

    // ============================================================
    // 12. SERIALIZATION AND DATA FORMATS
    // ============================================================
    {
      id: "java-serialization",
      title: "Serialization and Data Formats",
      title_sq: "Serializimi dhe Formatet e të Dhënave",
      content_sq: `Përdorimi i formateve si JSON (p.sh. përmes Jackson) për shkëmbim të dhënash.`,
      content_en: `Using formats like JSON (e.g., via Jackson) for data exchange.`,
      example: `ObjectMapper mapper = new ObjectMapper();`,
      analysis: [
        {
          sq: "Prefero DTO dhe JSON në vend të serializimit vendor të Java-s.",
          en: "Prefer DTOs and JSON over native Java serialization."
        }
      ],
      bestPractices: [
        {
          sq: "Valido të dhënat pas deserializimit.",
          en: "Validate data after deserialization."
        }
      ]
    },

    // ============================================================
    // 13. THREADS AND RUNNABLE
    // ============================================================
    {
      id: "java-threads-runnable",
      title: "Threads and Runnable",
      title_sq: "Thread-et dhe Runnable",
      content_sq: `Krijimi dhe menaxhimi i thjeshtë i thread-eve përmes Thread dhe Runnable.`,
      content_en: `Simple thread creation and management via Thread and Runnable.`,
      example: `Thread t = new Thread(() -> System.out.println("Running")); t.start();`,
      analysis: [
        {
          sq: "Thirrja e start() krijon thread të ri, ndër veprimet tjera kërkojnë executor.",
          en: "Calling start() creates a new thread."
        }
      ],
      bestPractices: [
        {
          sq: "Prefero ExecutorService në vend të krijimit manual të thread-eve.",
          en: "Prefer ExecutorService over manual thread creation."
        }
      ]
    },

    // ============================================================
    // 14. SYNCHRONIZATION AND THREAD SAFETY
    // ============================================================
    {
      id: "java-synchronization",
      title: "Synchronization and Thread Safety",
      title_sq: "Sinkronizimi dhe Siguria në Konkurrencë",
      content_sq: `Përdorimi i synchronized, volatile dhe klasave atomike për thread safety.`,
      content_en: `Using synchronized, volatile, and atomic classes for thread safety.`,
      example: `AtomicInteger count = new AtomicInteger(); count.incrementAndGet();`,
      analysis: [
        {
          sq: "Mbro gjendjen e përbashkët të ndryshueshme nga race conditions.",
          en: "Protect shared mutable state from race conditions."
        }
      ],
      bestPractices: [
        {
          sq: "Minimizo gjendjen e përbashkët të ndryshueshme.",
          en: "Minimize shared mutable state."
        }
      ]
    },

    // ============================================================
    // 15. EXECUTORSERVICE AND THREAD POOLS
    // ============================================================
    {
      id: "java-executor-service",
      title: "ExecutorService and Thread Pools",
      title_sq: "ExecutorService dhe Thread Pools",
      content_sq: `Menaxhimi i efikas i grupeve të thread-eve përmes ExecutorService.`,
      content_en: `Efficient thread pool management using ExecutorService.`,
      example: `ExecutorService exec = Executors.newFixedThreadPool(2);`,
      analysis: [
        {
          sq: "Ndan dërgimin e detyrave nga ekzekutimi i tyre fizik.",
          en: "Separates task submission from physical execution."
        }
      ],
      bestPractices: [
        {
          sq: "Mbyll gjithmonë ExecutorService kur nuk nevojitet më.",
          en: "Always shut down ExecutorService when done."
        }
      ]
    },

    // ============================================================
    // 16. FUTURE AND COMPLETABLEFUTURE
    // ============================================================
    {
      id: "java-completable-future",
      title: "Future and CompletableFuture",
      title_sq: "Future dhe CompletableFuture",
      content_sq: `Programim asinkron dhe kompozim i rezultateve me CompletableFuture.`,
      content_en: `Asynchronous programming and result composition with CompletableFuture.`,
      example: `CompletableFuture.supplyAsync(() -> "Data").thenAccept(System.out::println);`,
      analysis: [
        {
          sq: "Lejon lidhjen e operacioneve asinkrone pa bllokim të panevojshëm.",
          en: "Allows chaining async operations without unnecessary blocking."
        }
      ],
      bestPractices: [
        {
          sq: "Trajto gabimet në pipeline me exceptionally ose handle.",
          en: "Handle errors in pipelines using exceptionally or handle."
        }
      ]
    },

    // ============================================================
    // 17. VIRTUAL THREADS
    // ============================================================
    {
      id: "java-virtual-threads",
      title: "Virtual Threads",
      title_sq: "Virtual Threads në Java Moderne",
      content_sq: `Thread-e të lehta të shtuara në Java 21 për konkurrencë të lartë I/O-bound.`,
      content_en: `Lightweight threads added in Java 21 for high-concurrency I/O-bound tasks.`,
      example: `Thread.ofVirtual().start(() -> System.out.println("Virtual"));`,
      analysis: [
        {
          sq: "Lejojnë krijimin e miliona thread-eve pa ngarkuar rëndë sistemin.",
          en: "Allow creating millions of threads without heavy system overhead."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor virtual threads për workload-e që presin I/O.",
          en: "Use virtual threads for I/O-waiting workloads."
        }
      ]
    },

    // ============================================================
    // 18. CONCURRENCY UTILITIES
    // ============================================================
    {
      id: "java-concurrency-utilities",
      title: "Concurrency Utilities",
      title_sq: "Mjetet e Konkurrencës dhe Koleksionet Concurrent",
      content_sq: `Përdorimi i ConcurrentHashMap, BlockingQueue dhe mjeteve të tjera nga java.util.concurrent.`,
      content_en: `Using ConcurrentHashMap, BlockingQueue, and other utilities from java.util.concurrent.`,
      example: `ConcurrentHashMap<String, String> map = new ConcurrentHashMap<>();`,
      analysis: [
        {
          sq: "Ofrojnë struktura të gatshme thread-safe për qasje konkurrente.",
          en: "Provide ready-made thread-safe structures for concurrent access."
        }
      ],
      bestPractices: [
        {
          sq: "Zgjidh struktura konkurrente sipas modelit të qasjes.",
          en: "Choose concurrent structures based on access patterns."
        }
      ]
    },

    // ============================================================
    // 19. COLLECTIONS FRAMEWORK ADVANCED
    // ============================================================
    {
      id: "java-collections-advanced",
      title: "Collections Framework Advanced",
      title_sq: "Collections Framework — List, Set, Queue dhe Map",
      content_sq: `Zgjedhja e duhur e strukturave bazuar në ArrayList, HashSet, TreeMap, etj.`,
      content_en: `Proper selection of structures based on ArrayList, HashSet, TreeMap, etc.`,
      example: `Deque<String> stack = new ArrayDeque<>();`,
      analysis: [
        {
          sq: "Ndikimi i zgjedhjes së koleksionit në performancë dhe renditje.",
          en: "Impact of collection choice on performance and ordering."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor ArrayDeque në vend të klasës së vjetër Stack.",
          en: "Use ArrayDeque instead of the legacy Stack class."
        }
      ]
    },

    // ============================================================
    // 20. EQUALS, HASHCODE AND COMPARABLE
    // ============================================================
    {
      id: "java-equals-hashcode",
      title: "equals, hashCode and Comparable",
      title_sq: "Barazia, Hashimi dhe Krahasimi i Objekteve",
      content_sq: `Zbatimi i saktë i kontratave për equals(), hashCode() dhe Comparable.`,
      content_en: `Correct implementation of contracts for equals(), hashCode(), and Comparable.`,
      example: `public boolean equals(Object o) { ... }`,
      analysis: [
        {
          sq: "Kërkohet konsistencë mes equals dhe hashCode për koleksionet bazuara në hash.",
          en: "Consistency between equals and hashCode is required for hash-based collections."
        }
      ],
      bestPractices: [
        {
          sq: "Implemento equals() dhe hashCode() gjithmonë së bashku.",
          en: "Always implement equals() and hashCode() together."
        }
      ]
    },

    // ============================================================
    // 21. GENERICS ADVANCED
    // ============================================================
    {
      id: "java-generics-advanced",
      title: "Generics Advanced",
      title_sq: "Generics dhe Siguria e Tipave",
      content_sq: `Kuptimi i Type Erasure dhe përdorimi i saktë i wildcard-ve (PECS).`,
      content_en: `Understanding Type Erasure and proper wildcard usage (PECS).`,
      example: `static void process(List<? extends Number> list) {}`,
      analysis: [
        {
          sq: "Ofron fleksibilitet në API duke ruajtur sigurinë e tipit.",
          en: "Provides API flexibility while maintaining type safety."
        }
      ],
      bestPractices: [
        {
          sq: "Zbato rregullin PECS (Producer Extends, Consumer Super).",
          en: "Apply the PECS rule."
        }
      ]
    },

    // ============================================================
    // 22. LAMBDAS AND FUNCTIONAL INTERFACES
    // ============================================================
    {
      id: "java-lambdas-functional",
      title: "Lambda Expressions and Functional Interfaces",
      title_sq: "Lambda Expressions dhe Ndërfaqet Funksionale",
      content_sq: `Përdorimi i Predicate, Function, Consumer dhe Supplier për programim funksional.`,
      content_en: `Using Predicate, Function, Consumer, and Supplier for functional programming.`,
      example: `Predicate<String> check = s -> !s.isEmpty();`,
      analysis: [
        {
          sq: "Lejojnë kalimin e sjelljes si parametër në mënyrë koncize.",
          en: "Allow passing behavior as a parameter concisely."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor method references kur përmirësojnë lexueshmërinë.",
          en: "Use method references when they improve readability."
        }
      ]
    },

    // ============================================================
    // 23. STREAMS API DEEP DIVE
    // ============================================================
    {
      id: "java-streams-deep-dive",
      title: "Streams API Deep Dive",
      title_sq: "Streams API — Përpunimi Deklarativ i Koleksioneve",
      content_sq: `Përdorimi i operacioneve intermediate dhe terminale në pipelines.`,
      content_en: `Using intermediate and terminal operations in pipelines.`,
      example: `list.stream().filter(x -> x > 0).count();`,
      analysis: [
        {
          sq: "Operacionet janë lazy derisa të thirret operacioni terminal.",
          en: "Operations are lazy until a terminal operation is invoked."
        }
      ],
      bestPractices: [
        {
          sq: "Shmang efektet anësore brenda funksioneve të stream-it.",
          en: "Avoid side effects inside stream functions."
        }
      ]
    },

    // ============================================================
    // 24. COLLECTORS AND REDUCTION
    // ============================================================
    {
      id: "java-collectors",
      title: "Collectors and Stream Reduction",
      title_sq: "Collectors, Grouping dhe Reduction",
      content_sq: `Agregimi i të dhënave përmes groupingBy, toMap dhe reducing.`,
      content_en: `Data aggregation via groupingBy, toMap, and reducing.`,
      example: `Map<String, List<Item>> groups = list.stream().collect(Collectors.groupingBy(Item::getType));`,
      analysis: [
        {
          sq: "Lehtëson grupimin dhe statistikat e të dhënave të stream-it.",
          en: "Simplifies grouping and statistics on stream data."
        }
      ],
      bestPractices: [
        {
          sq: "Përcakto strategji bashkimi kur çelësat në toMap mund të përsëriten.",
          en: "Define merge strategies when map keys can duplicate."
        }
      ]
    },

    // ============================================================
    // 25. OPTIONAL DEEP DIVE
    // ============================================================
    {
      id: "java-optional-deep-dive",
      title: "Optional Deep Dive",
      title_sq: "Optional dhe Trajtimi i Vlerave që Mund të Mungojnë",
      content_sq: `Përdorimi i saktë i map, flatMap, orElseGet për menaxhimin e mungesës së vlerave.`,
      content_en: `Proper use of map, flatMap, and orElseGet for managing absent values.`,
      example: `opt.map(String::toUpperCase).orElseGet(() -> computeDefault());`,
      analysis: [
        {
          sq: "Shmang vlerësimin e parakohshëm përmes orElseGet.",
          en: "Avoids eager evaluation through orElseGet."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor orElseGet në vend të orElse për vlera të kushtueshme.",
          en: "Use orElseGet instead of orElse for costly fallbacks."
        }
      ]
    },

    // ============================================================
    // 26. DATE AND TIME API
    // ============================================================
    {
      id: "java-date-time",
      title: "Date and Time API",
      title_sq: "Java Date/Time API",
      content_sq: `Përdorimi i LocalDate, LocalTime, ZonedDateTime dhe Instant nga java.time.`,
      content_en: `Using LocalDate, LocalTime, ZonedDateTime, and Instant from java.time.`,
      example: `Instant now = Instant.now();`,
      analysis: [
        {
          sq: "Ofron API të sigurt dhe immutable për datat dhe kohën në krahasim me klasat e vjetra.",
          en: "Offers a safe, immutable date/time API compared to legacy classes."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor Instant për timestamp-e teknike dhe LocalDate për data kalendarike.",
          en: "Use Instant for technical timestamps and LocalDate for calendar dates."
        }
      ]
    },

    // ============================================================
    // 27. REGULAR EXPRESSIONS
    // ============================================================
    {
      id: "java-regex",
      title: "Regular Expressions",
      title_sq: "Regular Expressions dhe Pattern Matching për Tekst",
      content_sq: `Validimi dhe kërkimi i tekstit përmes Pattern dhe Matcher.`,
      content_en: `Text validation and searching via Pattern and Matcher.`,
      example: `Pattern.compile("\\d+").matcher("123").matches();`,
      analysis: [
        {
          sq: "Kompilimi i pattern-it rrit performancën kur përdoret shpesh.",
          en: "Pattern compilation improves performance when used frequently."
        }
      ],
      bestPractices: [
        {
          sq: "Kompilo Pattern një herë kur ripërdoret.",
          en: "Compile Pattern once when reused."
        }
      ]
    },

    // ============================================================
    // 28. REFLECTION AND ANNOTATIONS
    // ============================================================
    {
      id: "java-reflection-annotations",
      title: "Reflection and Annotations",
      title_sq: "Reflection dhe Annotations",
      content_sq: `Inspektimi i klasave në runtime dhe përdorimi i metadata përmes annotations.`,
      content_en: `Runtime class inspection and metadata usage via annotations.`,
      example: `Class<?> clazz = MyClass.class;`,
      analysis: [
        {
          sq: "Ofron fleksibilitet të lartë, por shton kompleksitet dhe ul performancën.",
          en: "Offers high flexibility but adds complexity and reduces performance."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor reflection vetëm kur fleksibiliteti në runtime është i domosdoshëm.",
          en: "Use reflection only when runtime flexibility is strictly required."
        }
      ]
    },

    // ============================================================
    // 29. JVM ARCHITECTURE
    // ============================================================
    {
      id: "java-jvm-architecture-deep",
      title: "JVM Architecture",
      title_sq: "Arkitektura e JVM",
      content_sq: `Kuptimi i ClassLoader, JIT compiler, Memory areas dhe ekzekutimit të bytecode.`,
      content_en: `Understanding ClassLoader, JIT compiler, memory areas, and bytecode execution.`,
      example: `javap -c MyClass`,
      analysis: [
        {
          sq: "JVM siguron ekzekutim të optimizuar dhe të pavarur nga platforma.",
          en: "The JVM ensures optimized, platform-independent execution."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor JDK që përputhet me versionin e synuar të projektit.",
          en: "Use a JDK matching your target project version."
        }
      ]
    },

    // ============================================================
    // 30. MEMORY MANAGEMENT AND GC
    // ============================================================
    {
      id: "java-memory-gc",
      title: "Memory Management and Garbage Collection",
      title_sq: "Menaxhimi i Memories dhe Garbage Collection",
      content_sq: `Menaxhimi i Heap, Stack dhe parandalimi i memory leaks.`,
      content_en: `Heap and Stack management and memory leak prevention.`,
      example: `// GC handles unreachable objects automatically`,
      analysis: [
        {
          sq: "Mosmbajtja e referencave të panevojshme ndihmon GC të lirojë memorien.",
          en: "Avoiding unnecessary references helps the GC reclaim memory."
        }
      ],
      bestPractices: [
        {
          sq: "Kufizo cache-t që mund të rriten pa kontroll në memorie.",
          en: "Limit caches that could grow uncontrollably in memory."
        }
      ]
    },

    // ============================================================
    // 31. JVM MONITORING AND PERFORMANCE
    // ============================================================
    {
      id: "java-jvm-monitoring",
      title: "JVM Monitoring and Performance",
      title_sq: "Monitorimi dhe Performanca e JVM",
      content_sq: `Përdorimi i mjeteteve si jcmd, jstack, jmap dhe JFR për diagnostikim.`,
      content_en: `Using tools like jcmd, jstack, jmap, and JFR for diagnostics.`,
      example: `jcmd <pid> Thread.print`,
      analysis: [
        {
          sq: "Matjet dhe profilizimi ndihmojnë në identifikimin e ngushticave të performancës.",
          en: "Measurements and profiling help identify performance bottlenecks."
        }
      ],
      bestPractices: [
        {
          sq: "Mat performancën nën ngarkesë reale para se të optimizosh.",
          en: "Measure performance under real load before optimizing."
        }
      ]
    },

    // ============================================================
    // 32. JDBC AND DATABASE CONNECTIVITY
    // ============================================================
    {
      id: "java-jdbc",
      title: "JDBC and Database Connectivity",
      title_sq: "JDBC dhe Lidhja me Databazën",
      content_sq: `Komunikimi me databaza relacionale përmes Connection dhe PreparedStatement.`,
      content_en: `Communicating with relational databases via Connection and PreparedStatement.`,
      example: `PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?");`,
      analysis: [
        {
          sq: "PreparedStatement mbron nga SQL injection përmes ndarjes së parametrave.",
          en: "PreparedStatement protects against SQL injection by separating parameters."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor gjithmonë PreparedStatement dhe mbyll burimet me try-with-resources.",
          en: "Always use PreparedStatement and close resources with try-with-resources."
        }
      ]
    },

    // ============================================================
    // 33. SQL TRANSACTIONS
    // ============================================================
    {
      id: "java-sql-transactions",
      title: "SQL Transactions and Connection Management",
      title_sq: "Transaksionet SQL dhe Menaxhimi i Lidhjeve",
      content_sq: `Menaxhimi i transaksioneve ACID përmes setAutoCommit, commit dhe rollback.`,
      content_en: `Managing ACID transactions through setAutoCommit, commit, and rollback.`,
      example: `conn.setAutoCommit(false); conn.commit();`,
      analysis: [
        {
          sq: "Siguron që operacionet e lidhura të dështojnë ose të suksesshëm së bashku.",
          en: "Ensures related operations either succeed or fail together."
        }
      ],
      bestPractices: [
        {
          sq: "Mbaj transaksionet sa më të shkurtra për të shmangur bllokimin e burimeve.",
          en: "Keep transactions as short as possible to avoid resource locking."
        }
      ]
    },

    // ============================================================
    // 34. UNIT TESTING WITH JUNIT
    // ============================================================
    {
      id: "java-junit-testing",
      title: "Unit Testing with JUnit",
      title_sq: "Unit Testing me JUnit",
      content_sq: `Krijimi i testeve të uniteteve me JUnit 5 dhe assertions.`,
      content_en: `Creating unit tests with JUnit 5 and assertions.`,
      example: `@Test void testAdd() { assertEquals(2, 1 + 1); }`,
      analysis: [
        {
          sq: "Testet e shpejta dhe të izoluara rrisin besueshmërinë e kodit.",
          en: "Fast and isolated tests increase code reliability."
        }
      ],
      bestPractices: [
        {
          sq: "Shkruaj teste të pavarura që verifikojnë sjelljen e dukshme.",
          en: "Write independent tests verifying observable behavior."
        }
      ]
    },

    // ============================================================
    // 35. INTEGRATION TESTING
    // ============================================================
    {
      id: "java-integration-testing",
      title: "Integration Testing and Test Doubles",
      title_sq: "Testet e Integrimit dhe Test Doubles",
      content_sq: `Përdorimi i test doubles (mocks, fakes, stubs) për integrim dhe izolim.`,
      content_en: `Using test doubles (mocks, fakes, stubs) for integration and isolation.`,
      example: `UserRepository repo = new FakeUserRepository();`,
      analysis: [
        {
          sq: "Ndihmon në testimin e ndërveprimeve mes komponentëve.",
          en: "Helps test interactions between components."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor fakes ose mocks kur varësitë e jashtme ngadalësojnë testimin.",
          en: "Use fakes or mocks when external dependencies slow down testing."
        }
      ]
    },

    // ============================================================
    // 36. MAVEN AND DEPENDENCY MANAGEMENT
    // ============================================================
    {
      id: "java-maven",
      title: "Maven and Dependency Management",
      title_sq: "Maven dhe Menaxhimi i Varësive",
      content_sq: `Menaxhimi i projektit dhe varësive përmes pom.xml dhe Maven lifecycle.`,
      content_en: `Project and dependency management via pom.xml and the Maven lifecycle.`,
      example: `mvn clean test`,
      analysis: [
        {
          sq: "Standardizon procesin e ndërtimit dhe menaxhimit të bibliotekave.",
          en: "Standardizes the build process and library management."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor versionet e përcaktuara eksplicitisht për varësitë.",
          en: "Explicitly define dependency versions."
        }
      ]
    },

    // ============================================================
    // 37. GRADLE AND BUILD AUTOMATION
    // ============================================================
    {
      id: "java-gradle",
      title: "Gradle and Build Automation",
      title_sq: "Gradle dhe Automatizimi i Build-it",
      content_sq: `Përdorimi i Gradle Kotlin/Groovy DSL për build automation.`,
      content_en: `Using Gradle Kotlin/Groovy DSL for build automation.`,
      example: `./gradlew build`,
      analysis: [
        {
          sq: "Ofron fleksibilitet të lartë dhe performancë përmes build cache.",
          en: "Offers high flexibility and performance via the build cache."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor gjithmonë Gradle Wrapper për ekzekutim të standardizuar.",
          en: "Always use the Gradle Wrapper for standardized execution."
        }
      ]
    },

    // ============================================================
    // 38. LOGGING
    // ============================================================
    {
      id: "java-logging",
      title: "Logging",
      title_sq: "Logging dhe Diagnostikimi i Aplikacionit",
      content_sq: `Regjistrimi i ngjarjeve përmes SLF4J dhe niveleve të logimit.`,
      content_en: `Recording events via SLF4J and logging levels.`,
      example: `Logger log = LoggerFactory.getLogger(MyClass.class); log.info("Msg");`,
      analysis: [
        {
          sq: "Lehtëson diagnostikimin pa ndikuar te performanca kur nivelet janë çaktivizuar.",
          en: "Eases diagnostics without hurting performance when levels are disabled."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor placeholder-a në vend të bashkimit të vargjeve në log.",
          en: "Use placeholders instead of string concatenation in logs."
        }
      ]
    },

    // ============================================================
    // 39. SOLID PRINCIPLES
    // ============================================================
    {
      id: "java-solid-review",
      title: "SOLID Principles",
      title_sq: "Parimet SOLID",
      content_sq: `Përmbledhje e parimeve SOLID për kod të mirëmbajtshëm.`,
      content_en: `Review of SOLID principles for maintainable code.`,
      example: `// Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion`,
      analysis: [
        {
          sq: "Zvogëlojnë lidhjen e fortë dhe rrisin fleksibilitetin e sistemit.",
          en: "Reduce tight coupling and increase system flexibility."
        }
      ],
      bestPractices: [
        {
          sq: "Apliko parimet kur zvogëlojnë kompleksitetin real.",
          en: "Apply principles when they genuinely reduce complexity."
        }
      ]
    },

    // ============================================================
    // 40. DESIGN PATTERNS: CREATIONAL
    // ============================================================
    {
      id: "java-patterns-creational",
      title: "Design Patterns: Creational",
      title_sq: "Design Patterns Krijuese",
      content_sq: `Pattern-e si Singleton, Factory Method, Builder për krijimin e saktë të objekteve.`,
      content_en: `Patterns like Singleton, Factory Method, and Builder for proper object creation.`,
      example: `DocumentExporter exporter = ExporterFactory.create("pdf");`,
      analysis: [
        {
          sq: "Menaxhojnë kompleksitetin dhe vendimmarrjen e inicializimit.",
          en: "Manage initialization complexity and decision-making."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor Builder për objekte me shumë parametra opsionalë.",
          en: "Use Builder for objects with many optional parameters."
        }
      ]
    },

    // ============================================================
    // 41. DESIGN PATTERNS: STRUCTURAL AND BEHAVIORAL
    // ============================================================
    {
      id: "java-patterns-structural-behavioral",
      title: "Design Patterns: Structural and Behavioral",
      title_sq: "Design Patterns Strukturore dhe Sjellore",
      content_sq: `Pattern-e si Adapter, Strategy, Observer për organizimin e marrëdhënieve dhe sjelljes.`,
      content_en: `Patterns like Adapter, Strategy, and Observer for organizing relationships and behavior.`,
      example: `CheckoutService service = new CheckoutService(new DiscountPrice(0.10));`,
      analysis: [
        {
          sq: "Lejojnë ndryshimin e algoritmikeve dhe lidhjen e komponentëve.",
          en: "Allow swapping algorithms and connecting components."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor Strategy kur algoritmet duhet të ndërrohen në dinamikë.",
          en: "Use Strategy when algorithms need to be swapped dynamically."
        }
      ]
    },

    // ============================================================
    // 42. CLEAN CODE AND REFACTORING
    // ============================================================
    {
      id: "java-clean-code",
      title: "Clean Code and Refactoring",
      title_sq: "Clean Code dhe Refactoring",
      content_sq: `Parimet e lexueshmërisë, emërtimit dhe refaktorimit të vazhdueshëm të kodit.`,
      content_en: `Principles of readability, naming, and continuous code refactoring.`,
      example: `// Small methods with clear intent and named constants`,
      analysis: [
        {
          sq: "Kodi i pastër ul kostot afatgjata të mirëmbajtjes.",
          en: "Clean code reduces long-term maintenance costs."
        }
      ],
      bestPractices: [
        {
          sq: "Refaktoro me hapa të vegjël dhe mbështetu te testet.",
          en: "Refactor in small steps and rely on tests."
        }
      ]
    },

    // ============================================================
    // 43. REST APIS AND HTTP
    // ============================================================
    {
      id: "java-rest-apis-http",
      title: "REST APIs and HTTP",
      title_sq: "REST API dhe HTTP",
      content_sq: `Parimet e REST, metodat HTTP dhe status codes për shërbime web.`,
      content_en: `REST principles, HTTP methods, and status codes for web services.`,
      example: `GET /api/products/42`,
      analysis: [
        {
          sq: "Përdorimi i saktë i metodave dhe statuseve HTTP siguron API të parashikueshme.",
          en: "Proper use of HTTP methods and statuses ensures predictable APIs."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor emra burimesh në shumës, si /api/products.",
          en: "Use plural resource names like /api/products."
        }
      ]
    },

    // ============================================================
    // 44. SPRING BOOT FUNDAMENTALS
    // ============================================================
    {
      id: "java-spring-boot-fundamentals",
      title: "Spring Boot Fundamentals",
      title_sq: "Bazat e Spring Boot",
      content_sq: `Auto-configuration, starter dependencies dhe nisja përmes @SpringBootApplication.`,
      content_en: `Auto-configuration, starter dependencies, and booting via @SpringBootApplication.`,
      example: `@SpringBootApplication public class App { ... }`,
      analysis: [
        {
          sq: "Eliminon konfigurimet e gjata XML dhe thjeshton ngritjen e aplikacioneve.",
          en: "Eliminates lengthy XML configs and simplifies app bootstrapping."
        }
      ],
      bestPractices: [
        {
          sq: "Vendos klasën kryesore në paketën rrënjë të projektit.",
          en: "Place the main class in the project's root package."
        }
      ]
    },

    // ============================================================
    // 45. DEPENDENCY INJECTION AND IOC (SPRING)
    // ============================================================
    {
      id: "java-spring-di-ioc",
      title: "Dependency Injection and IoC",
      title_sq: "Dependency Injection dhe Inversion of Control",
      content_sq: `Menaxhimi i bean-ve dhe konstruktorëve përmes kontejnerit IoC të Spring.`,
      content_en: `Managing beans and constructors via Spring's IoC container.`,
      example: `public CheckoutService(PaymentGateway gw) { this.gw = gw; }`,
      analysis: [
        {
          sq: "Constructor injection siguron varësi të qarta dhe të pandryshueshme.",
          en: "Constructor injection ensures clear and immutable dependencies."
        }
      ],
      bestPractices: [
        {
          sq: "Prefero constructor injection për të gjitha varësitë e detyrueshme.",
          en: "Prefer constructor injection for all required dependencies."
        }
      ]
    },

    // ============================================================
    // 46. APPLICATION CONFIGURATION AND PROFILES
    // ============================================================
    {
      id: "java-spring-config-profiles",
      title: "Application Configuration and Profiles",
      title_sq: "Konfigurimi i aplikacionit dhe profilet",
      content_sq: `Përdorimi i application.yml, variablave të mjedisit dhe profileve (dev, prod).`,
      content_en: `Using application.yml, environment variables, and profiles (dev, prod).`,
      example: `spring.profiles.active=prod`,
      analysis: [
        {
          sq: "Ndan konfigurimin nga kodi dhe përshtatet sipas mjedisit.",
          en: "Separates configuration from code and adapts per environment."
        }
      ],
      bestPractices: [
        {
          sq: "Mos ruaj sekrete ose fjalëkalime në skedarë të kontrolluar nga version control.",
          en: "Do not store secrets or passwords in version-controlled files."
        }
      ]
    },

    // ============================================================
    // 47. SPRING MVC AND REST CONTROLLERS
    // ============================================================
    {
      id: "java-spring-mvc-controllers",
      title: "Spring MVC and REST Controllers",
      title_sq: "Spring MVC dhe REST Controllers",
      content_sq: `Përdorimi i @RestController, @PathVariable dhe @RequestBody për endpoint-e web.`,
      content_en: `Using @RestController, @PathVariable, and @RequestBody for web endpoints.`,
      example: `@GetMapping("/{id}") ProductDto get(@PathVariable long id) { ... }`,
      analysis: [
        {
          sq: "Mapon kërkesat HTTP te metodat Java duke serializuar automatikisht JSON.",
          en: "Maps HTTP requests to Java methods while auto-serializing JSON."
        }
      ],
      bestPractices: [
        {
          sq: "Mbaji controller-at të vegjël dhe delego logjikën te shërbimet.",
          en: "Keep controllers thin and delegate logic to services."
        }
      ]
    },

    // ============================================================
    // 48. VALIDATION AND EXCEPTION HANDLING
    // ============================================================
    {
      id: "java-spring-validation-exceptions",
      title: "Validation and Exception Handling",
      title_sq: "Validimi dhe trajtimi i gabimeve",
      content_sq: `Jakarta Bean Validation (@Valid) dhe trajtimi i gabimeve përmes @RestControllerAdvice.`,
      content_en: `Jakarta Bean Validation (@Valid) and exception handling via @RestControllerAdvice.`,
      example: `@RestControllerAdvice class ErrorHandler { ... }`,
      analysis: [
        {
          sq: "Ofron përgjigje HTTP të konsistente dhe të lexueshme kur ndodhin gabime.",
          en: "Provides consistent and readable HTTP responses when errors occur."
        }
      ],
      bestPractices: [
        {
          sq: "Ktho mesazhe dhe status-e të sakta për input-e të pavlefshme.",
          en: "Return accurate statuses and messages for invalid input."
        }
      ]
    },

    // ============================================================
    // 49. SPRING SECURITY FUNDAMENTALS
    // ============================================================
    {
      id: "java-spring-security",
      title: "Spring Security Fundamentals",
      title_sq: "Bazat e Spring Security",
      content_sq: `Konfigurimi i SecurityFilterChain, autentikimit dhe autorizimit.`,
      content_en: `Configuring SecurityFilterChain, authentication, and authorization.`,
      example: `http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated());`,
      analysis: [
        {
          sq: "Mbron endpoint-et duke filtruar kërkesat HTTP sipas roleve dhe rregullave.",
          en: "Protects endpoints by filtering HTTP requests based on roles and rules."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor gjithmonë HTTPS dhe menaxho saktë token-et ose sesionet.",
          en: "Always use HTTPS and properly manage tokens or sessions."
        }
      ]
    },

    // ============================================================
    // 50. JPA AND HIBERNATE FUNDAMENTALS
    // ============================================================
    {
      id: "java-jpa-hibernate",
      title: "JPA and Hibernate Fundamentals",
      title_sq: "Bazat e JPA dhe Hibernate",
      content_sq: `Hartëzimi i objekteve Java në tabela përmes @Entity, @Id dhe EntityManager.`,
      content_en: `Mapping Java objects to tables via @Entity, @Id, and EntityManager.`,
      example: `@Entity @Table(name = "products") public class Product { @Id ... }`,
      analysis: [
        {
          sq: "Ofron ORM për menaxhimin e persistencës përmes persistence context.",
          en: "Provides ORM for managing persistence through the persistence context."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor BigDecimal për shuma monetare në vend të double.",
          en: "Use BigDecimal for monetary amounts instead of double."
        }
      ]
    },

    // ============================================================
    // 51. SPRING DATA JPA REPOSITORIES
    // ============================================================
    {
      id: "java-spring-data-jpa",
      title: "Spring Data JPA Repositories",
      title_sq: "Repository-t me Spring Data JPA",
      content_sq: `Zgjerimi i JpaRepository për operacione CRUD dhe query automatike nga emrat e metodave.`,
      content_en: `Extending JpaRepository for CRUD operations and derived query methods.`,
      example: `interface ProductRepo extends JpaRepository<Product, Long> { List<Product> findByName(String n); }`,
      analysis: [
        {
          sq: "Gjeneron automatikisht implementimin e qasjes në të dhëna gjatë runtime-it.",
          en: "Automatically generates data access implementations at runtime."
        }
      ],
      bestPractices: [
        {
          sq: "Mbaj query-t në repository dhe logjikën e biznesit në shërbime.",
          en: "Keep queries in repositories and business logic in services."
        }
      ]
    },

    // ============================================================
    // 52. ENTITY RELATIONSHIPS AND FETCHING
    // ============================================================
    {
      id: "java-jpa-relationships",
      title: "Entity Relationships and Fetching",
      title_sq: "Marrëdhëniet mes entiteteve dhe Fetching",
      content_sq: `Menaxhimi i lidhjeve @OneToMany, @ManyToOne dhe strategjive LAZY/EAGER.`,
      content_en: `Managing @OneToMany, @ManyToOne associations and LAZY/EAGER fetch strategies.`,
      example: `@ManyToOne(fetch = FetchType.LAZY) private Customer customer;`,
      analysis: [
        {
          sq: "LAZY fetching ndihmon në shmangien e ngarkimit të panevojshëm të të dhënave.",
          en: "LAZY fetching helps avoid loading unnecessary data."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor LAZY si parazgjedhje për koleksionet dhe shoqërimet.",
          en: "Use LAZY by default for collections and associations."
        }
      ]
    },

    // ============================================================
    // 53. PAGINATION AND SORTING
    // ============================================================
    {
      id: "java-pagination-sorting",
      title: "Pagination, Sorting, and Query Performance",
      title_sq: "Pagination, renditja dhe performanca e query-ve",
      content_sq: `Përdorimi i Pageable, Page dhe Slice për ndarjen e rezultateve në faqe.`,
      content_en: `Using Pageable, Page, and Slice for result pagination.`,
      example: `Page<Product> findAll(Pageable pageable);`,
      analysis: [
        {
          sq: "Kufizon sasinë e të dhënave të kthyera dhe mbron memorien e aplikacionit.",
          en: "Limits returned data volume and protects application memory."
        }
      ],
      bestPractices: [
        {
          sq: "Përcakto madhësi maksimale për faqet e kërkuara nga klientët.",
          en: "Define maximum page sizes for client requests."
        }
      ]
    },

    // ============================================================
    // 54. CACHING STRATEGIES
    // ============================================================
    {
      id: "java-caching-strategies",
      title: "Caching Strategies",
      title_sq: "Strategjitë e caching",
      content_sq: `Përdorimi i @Cacheable, @CachePut dhe @CacheEvict për ruajtje të përkohshme.`,
      content_en: `Using @Cacheable, @CachePut, and @CacheEvict for temporary data storage.`,
      example: `@Cacheable(cacheNames = "products", key = "#id")`,
      analysis: [
        {
          sq: "Ul latencën dhe ngarkesën e databazës për të dhëna që ndryshojnë rrallë.",
          en: "Reduces latency and database load for infrequently changing data."
        }
      ],
      bestPractices: [
        {
          sq: "Lidh @CacheEvict me përditësimet për të shmangur vlera të vjetruara.",
          en: "Tie @CacheEvict to updates to prevent stale values."
        }
      ]
    },

    // ============================================================
    // 55. ASYNCHRONOUS MESSAGING
    // ============================================================
    {
      id: "java-async-messaging",
      title: "Asynchronous Messaging with Kafka and RabbitMQ",
      title_sq: "Mesazhet asinkrone me Kafka dhe RabbitMQ",
      content_sq: `Komunikim asinkron mes shërbimeve përmes prodhuesve dhe konsumatorëve të mesazheve.`,
      content_en: `Asynchronous inter-service communication via message producers and consumers.`,
      example: `kafkaTemplate.send("topic", key, payload);`,
      analysis: [
        {
          sq: "Ndan dërguesin nga marrësi dhe rrit shkallëzimin e sistemit.",
          en: "Decouples producers from receivers and increases system scalability."
        }
      ],
      bestPractices: [
        {
          sq: "Dizajno konsumatorë idempotentë për të trajtuar dublikatat e mesazheve.",
          en: "Design idempotent consumers to handle duplicate messages."
        }
      ]
    },

    // ============================================================
    // 56. TRANSACTIONAL OUTBOX PATTERN
    // ============================================================
    {
      id: "java-transactional-outbox",
      title: "Transactional Outbox Pattern",
      title_sq: "Modeli Transactional Outbox",
      content_sq: `Ruajtja e event-eve në të njëjtin transaksion databaze me ndryshimet e biznesit.`,
      content_en: `Storing events in the same database transaction as business updates.`,
      example: `orderRepository.save(order); outboxRepository.save(event);`,
      analysis: [
        {
          sq: "Parandalon dështimet e dyfishta mes ruajtjes në databazë dhe publikimit të mesazhit.",
          en: "Prevents dual-write failures between database persistence and message publishing."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor identifikues unikë për çdo event të ruajtur në outbox.",
          en: "Use unique identifiers for every outbox event."
        }
      ]
    },

    // ============================================================
    // 57. DOCKER AND CONTAINERIZATION
    // ============================================================
    {
      id: "java-docker-containerization",
      title: "Docker and Containerization",
      title_sq: "Docker dhe containerization",
      content_sq: `Paketimi i aplikacioneve Java në kontejnerë përmes Dockerfiles me multi-stage builds.`,
      content_en: `Packaging Java applications into containers using multi-stage Dockerfiles.`,
      example: `FROM eclipse-temurin:21-jre`,
      analysis: [
        {
          sq: "Siguron ekzekutim të qëndrueshëm në çdo mjedis dhe lehtëson shpërndarjen.",
          en: "Ensures consistent execution across environments and simplifies distribution."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor multi-stage builds dhe ekzekuto si përdorues jo-root.",
          en: "Use multi-stage builds and run as a non-root user."
        }
      ]
    },

    // ============================================================
    // 58. CI/CD PIPELINES
    // ============================================================
    {
      id: "java-cicd-pipelines",
      title: "CI/CD Pipelines",
      title_sq: "Pipeline-t CI/CD",
      content_sq: `Automatizimi i build-it, testimeve dhe deploy-it përmes pipeline-ve si GitHub Actions.`,
      content_en: `Automating builds, tests, and deployment via pipelines like GitHub Actions.`,
      example: `mvn clean verify`,
      analysis: [
        {
          sq: "Zbulon herët problemet dhe standardizon procesin e dërgimit në prodhim.",
          en: "Catches issues early and standardizes the path to production."
        }
      ],
      bestPractices: [
        {
          sq: "Ekzekuto testet automatike në çdo ndryshim apo pull request.",
          en: "Run automated tests on every change or pull request."
        }
      ]
    },

    // ============================================================
    // 59. PRODUCTION CONFIGURATION AND DEPLOYMENT
    // ============================================================
    {
      id: "java-production-deployment",
      title: "Production Readiness and Deployment",
      title_sq: "Konfigurimi dhe deploy në production",
      content_sq: `Konfigurimi i mbylljes së butë (graceful shutdown) dhe sondave të shëndetit (probes).`,
      content_en: `Configuring graceful shutdown and health probes for production readiness.`,
      example: `server.shutdown=graceful`,
      analysis: [
        {
          sq: "Siguron që aplikacioni të mos ndërpresë kërkesat aktive gjatë përditësimeve.",
          en: "Ensures the app does not drop active requests during updates."
        }
      ],
      bestPractices: [
        {
          sq: "Aktivizo graceful shutdown dhe konfiguro readiness/liveness probes.",
          en: "Enable graceful shutdown and configure readiness/liveness probes."
        }
      ]
    },

    // ============================================================
    // 60. LOGGING AND OBSERVABILITY
    // ============================================================
    {
      id: "java-logging-observability",
      title: "Logging and Observability",
      title_sq: "Logging dhe observability",
      content_sq: `Regjistrimi i ngjarjeve strukturuara përmes SLF4J dhe Logback.`,
      content_en: `Recording structured events via SLF4J and Logback.`,
      example: `log.info("Processing orderId={}", orderId);`,
      analysis: [
        {
          sq: "Log-et e strukturuara ndihmojnë në kërkimin dhe analizën e shpejtë të problemeve.",
          en: "Structured logs aid in fast searching and troubleshooting."
        }
      ],
      bestPractices: [
        {
          sq: "Mos regjistro kurrë të dhëna sensitive, fjalëkalime ose token-e.",
          en: "Never log sensitive data, passwords, or tokens."
        }
      ]
    },

    // ============================================================
    // 61. METRICS AND MONITORING
    // ============================================================
    {
      id: "java-metrics-monitoring",
      title: "Metrics and Application Monitoring",
      title_sq: "Metrics dhe monitorimi i aplikacionit",
      content_sq: `Mbledhja e metrikave numerike përmes Micrometer dhe Counter/Timer.`,
      content_en: `Gathering numerical metrics via Micrometer and Counters/Timers.`,
      example: `Counter.builder("payments.success").register(registry);`,
      analysis: [
        {
          sq: "Ndihmon në matjen e shpejtësisë, gabimeve dhe ngarkesës së sistemit.",
          en: "Helps measure system throughput, error rates, and load."
        }
      ],
      bestPractices: [
        {
          sq: "Shmang metric labels me vlera të pafundme (high cardinality).",
          en: "Avoid metric labels with unbounded unique values (high cardinality)."
        }
      ]
    },

    // ============================================================
    // 62. DISTRIBUTED TRACING
    // ============================================================
    {
      id: "java-distributed-tracing",
      title: "Distributed Tracing and OpenTelemetry",
      title_sq: "Distributed tracing dhe OpenTelemetry",
      content_sq: `Gjurmimi i kërkesave nëpër disa shërbime përmes OpenTelemetry dhe Trace IDs.`,
      content_en: `Tracking requests across multiple services using OpenTelemetry and Trace IDs.`,
      example: `Span span = tracer.spanBuilder("operation").startSpan();`,
      analysis: [
        {
          sq: "Lehtëson identifikimin e vonesave dhe gabimeve në arkitekturat e shpërndara.",
          en: "Simplifies identifying latency and errors in distributed architectures."
        }
      ],
      bestPractices: [
        {
          sq: "Propago kontekstin e trace-it në çdo kërkesë HTTP dhe mesazh asinkron.",
          en: "Propagate trace context across every HTTP request and async message."
        }
      ]
    },

    // ============================================================
    // 63. MICROSERVICES ARCHITECTURE
    // ============================================================
    {
      id: "java-microservices-architecture",
      title: "Microservices Architecture",
      title_sq: "Arkitektura e Microservices",
      content_sq: `Ndarja e sistemeve në shërbime të pavarura bazuar në domain-in e biznesit.`,
      content_en: `Splitting systems into independent services based on business domains.`,
      example: `// Catalog Service, Order Service, Payment Service`,
      analysis: [
        {
          sq: "Ofron autonomi ekipes dhe shkallëzim të veçantë, por shton kompleksitet rrjeti.",
          en: "Provides team autonomy and selective scaling while adding network complexity."
        }
      ],
      bestPractices: [
        {
          sq: "Përcakto kufijtë e shërbimeve sipas përgjegjësive reale të biznesit (domain).",
          en: "Define service boundaries around real business domain responsibilities."
        }
      ]
    },

    // ============================================================
    // 64. JAVA CONCURRENCY FUNDAMENTALS
    // ============================================================
    {
      id: "java-concurrency-fundamentals",
      title: "Java Concurrency Fundamentals",
      title_sq: "Bazat e Concurrency në Java",
      content_sq: `Dallimi mes concurrency dhe parallelism dhe menaxhimi i thread-eve bazë.`,
      content_en: `Distinguishing between concurrency and parallelism and managing basic threads.`,
      example: `Thread worker = new Thread(() -> { ... }); worker.start();`,
      analysis: [
        {
          sq: "Koordinimi i duhur i detyrave parandalon konfliktet dhe gabimet e gjendjes.",
          en: "Proper task coordination prevents state conflicts and bugs."
        }
      ],
      bestPractices: [
        {
          sq: "Minimizo gjendjen e përbashkët të ndryshueshme mes thread-eve.",
          en: "Minimize shared mutable state between threads."
        }
      ]
    },

    // ============================================================
    // 65. EXECUTORSERVICE ADVANCED
    // ============================================================
    {
      id: "java-executor-service-advanced",
      title: "ExecutorService and Thread Pools",
      title_sq: "ExecutorService dhe thread pools",
      content_sq: `Përdorimi i avancuar i thread pools, submit, shutdown dhe awaitTermination.`,
      content_en: `Advanced usage of thread pools, submit, shutdown, and awaitTermination.`,
      example: `ExecutorService exec = Executors.newFixedThreadPool(4);`,
      analysis: [
        {
          sq: "Optimizimi i burimeve përmes ripërdorimit të thread-eve.",
          en: "Resource optimization through thread reuse."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor bllokun try-finally për të mbyllur executor-in në mënyrë të sigurt.",
          en: "Use try-finally blocks to safely shut down executors."
        }
      ]
    },

    // ============================================================
    // 66. COMPLETABLEFUTURE ADVANCED
    // ============================================================
    {
      id: "java-completable-future-advanced",
      title: "CompletableFuture and Asynchronous Pipelines",
      title_sq: "CompletableFuture dhe pipeline-t asinkrone",
      content_sq: `Kompozimi i linjave asinkrone me thenCompose, thenCombine dhe exceptionally.`,
      content_en: `Composing async pipelines with thenCompose, thenCombine, and exceptionally.`,
      example: `first.thenCombine(second, Integer::sum).join();`,
      analysis: [
        {
          sq: "Lejon ndërtimin e rrjedhave komplekse asinkrone pa bllokim të parakohshëm.",
          en: "Allows building complex async flows without premature blocking."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor thenCompose për operacione që vetë kthejnë CompletableFuture.",
          en: "Use thenCompose for operations that themselves return a CompletableFuture."
        }
      ]
    },

    // ============================================================
    // 67. VIRTUAL THREADS ADVANCED
    // ============================================================
    {
      id: "java-virtual-threads-advanced",
      title: "Virtual Threads in Modern Java",
      title_sq: "Virtual Threads në Java moderne",
      content_sq: `Zbatimi praktik i virtual threads me Executors.newVirtualThreadPerTaskExecutor().`,
      content_en: `Practical implementation of virtual threads with Executors.newVirtualThreadPerTaskExecutor().`,
      example: `try (var exec = Executors.newVirtualThreadPerTaskExecutor()) { ... }`,
      analysis: [
        {
          sq: "Ideale për shërbime web dhe I/O-bound me fluks të madh kërkesash.",
          en: "Ideal for web services and I/O-bound tasks with massive request volumes."
        }
      ],
      bestPractices: [
        {
          sq: "Mos krijo pool të dedikuar për virtual threads; krijo një për çdo detyrë.",
          en: "Do not pool virtual threads; create one per task."
        }
      ]
    },

    // ============================================================
    // 68. SYNCHRONIZATION AND ATOMIC VARIABLES
    // ============================================================
    {
      id: "java-synchronization-atomic",
      title: "Synchronization, Locks, and Atomic Variables",
      title_sq: "Synchronization, Locks dhe variablat atomike",
      content_sq: `Përdorimi i saktë i synchronized, volatile, ReentrantLock dhe AtomicInteger.`,
      content_en: `Proper use of synchronized, volatile, ReentrantLock, and AtomicInteger.`,
      example: `AtomicInteger count = new AtomicInteger(); count.incrementAndGet();`,
      analysis: [
        {
          sq: "Zgjidh mekanizmin më të thjeshtë që mbron saktë invariantin e kërkuar.",
          en: "Choose the simplest mechanism that correctly protects the required invariant."
        }
      ],
      bestPractices: [
        {
          sq: "Përdor klasat Atomic për numërues dhe operacione të thjeshta atomike.",
          en: "Use Atomic classes for counters and simple atomic operations."
        }
      ]
    },

    // ============================================================
    // 69. RACE CONDITIONS AND THREAD SAFETY
    // ============================================================
    {
      id: "java-race-conditions",
      title: "Race Conditions and Thread Safety",
      title_sq: "Race conditions dhe thread safety",
      content_sq: `Identifikimi dhe parandalimi i kushteve të garës (race conditions) në kodin konkurrent.`,
      content_en: `Identifying and preventing race conditions in concurrent code.`,
      example: `public synchronized boolean reserveOne() { ... }`,
      analysis: [
        {
          sq: "Kërkon mbrojtjen e gjithë operacionit logjik, jo vetëm të një lexime/shkrimi të vetëm.",
          en: "Requires protecting the entire logical operation, not just a single read/write."
        }
      ],
      bestPractices: [
        {
          sq: "Mbro të gjithë sekuencën logjike që përbën një transaksion memorieje.",
          en: "Protect the entire logical sequence comprising a memory transaction."
        }
      ]
    },

    // ============================================================
    // 70. DEADLOCKS AND LIVELOCKS
    // ============================================================
    {
      id: "java-deadlocks-livelocks",
      title: "Deadlocks, Livelocks, and Starvation",
      title_sq: "Deadlocks, livelocks dhe starvation",
      content_sq: `Parandalimi i bllokimeve të përhershme përmes rendit të saktë të lock-eve dhe tryLock.`,
      content_en: `Preventing permanent blocks through consistent lock ordering and tryLock.`,
      example: `boolean locked = lock.tryLock(3, TimeUnit.SECONDS);`,
      analysis: [
        {
          sq: "Planifikimi i kujdesshëm i burimeve shmang bllokimin e ndërsjellë të thread-eve.",
          en: "Careful resource planning prevents mutual thread blocking."
        }
      ],
      bestPractices: [
        {
          sq: "Merr lock-et gjithmonë në të njëjtin rend global në gjithë aplikacionin.",
          en: "Always acquire locks in the same global order across the application."
        }
      ]
    }
  ]
};

// CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = javaKnowledge;
}
