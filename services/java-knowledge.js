// ============================================================================
// XSUS AI - JAVA ULTIMATE MASTER KNOWLEDGE BASE
// Version: 6.0.0 (Complete Enterprise & Core JVM Engine)
// ============================================================================

export const javaMasterKnowledge = {
    language: "Java",
    creator: "James Gosling / Sun Microsystems (1995)",
    paradigm: "Object-Oriented, Class-based, Concurrent, Strongly Typed",
    runtimeEnvironment: "JVM (Java Virtual Machine)",
    
    categories: [
        {
            section: "1. JVM Architecture & Fundamentals",
            topics: [
                {
                    term: "JVM (Java Virtual Machine)",
                    definition: "Një makinë virtuale që ekzekuton bajtkodin e Java-s, duke e shndërruar në instruksione specifike për sistemin operativ.",
                    example: "javac Main.java -> Main.class -> java Main"
                },
                {
                    term: "JDK vs JRE vs JVM",
                    definition: "JVM ekzekuton bajtkodin. JRE përfshin JVM + libraritë standarde. JDK përfshin JRE + mjetet e zhvillimit.",
                    example: "JDK = JRE + Development Tools; JRE = JVM + Libraries."
                },
                {
                    term: "Bytecode & JIT Compiler",
                    definition: "Kodi kompilohet në bajtkod. JIT (Just-In-Time) compiler e përkthen në kod makine në kohë reale për performancë.",
                    example: "HotSpot JIT kompilon pjesët e përdorura shpesh direkt në kod nativ."
                },
                {
                    term: "Primitive vs Reference Data Types",
                    definition: "Primitive (int, boolean) ruhen në Stack. Llojet e referencës (objektet) ruajnë adresën e kujtesës në Heap.",
                    example: "int age = 25; String name = new String('Xsus');"
                }
            ]
        },
        {
            section: "2. Object-Oriented Programming (OOP) in Java",
            topics: [
                {
                    term: "Four Pillars of OOP",
                    definition: "Encapsulation, Inheritance, Polymorphism, dhe Abstraction.",
                    example: "public class Dog extends Animal implements Pet { ... }"
                },
                {
                    term: "Interfaces vs Abstract Classes",
                    definition: "Klasat abstrakte mund të kenë fusha gjendjeje. Interfaqet përcaktojnë kontrata sjelljeje dhe lejojnë trashëgimi të shumëfishtë.",
                    example: "public interface Runnable { void run(); }"
                },
                {
                    term: "Access Modifiers",
                    definition: "private, default (package-private), protected, public.",
                    example: "private String secretKey; public void setKey(String k) { this.secretKey = k; }"
                }
            ]
        },
        {
            section: "3. Memory Management & Garbage Collection",
            topics: [
                {
                    term: "Heap vs Stack Memory",
                    definition: "Stack ruan thirrjet e metodave dhe variablat lokale. Heap ruan objektet dhe instancat dinamike.",
                    example: "Stack ekzekuton thirrjen; Heap ruan objektin."
                },
                {
                    term: "Garbage Collection (GC)",
                    definition: "Procesi automatik në JVM që çliron memorjen duke fshirë objektet pa referenca aktive.",
                    example: "System.gc();"
                }
            ]
        },
        {
            section: "4. Collections Framework",
            topics: [
                {
                    term: "List, Set, dhe Map",
                    definition: "List ruan renditjen dhe lejon dublikime. Set ruan elemente unike. Map ruan çelës-vlerë.",
                    example: "List<String> list = new ArrayList<>(); Map<String, Integer> map = new HashMap<>();"
                },
                {
                    term: "HashMap Internal Mechanics",
                    definition: "Përdor buckets dhe hashCode() për shpërndarjen e çelësave, duke përdorur Linked Lists ose Red-Black Trees për përplasjet.",
                    example: "map.put('xsus', 100);"
                }
            ]
        },
        {
            section: "5. Concurrency & Multithreading",
            topics: [
                {
                    term: "Threads & Runnable",
                    definition: "Fije ekzekutimi brenda një procesi. Krijohet duke zgjeruar Thread ose implementuar Runnable.",
                    example: "Thread t = new Thread(() -> System.out.println('Running')); t.start();"
                },
                {
                    term: "Executor Service & Thread Pools",
                    definition: "Kornizë për menaxhimin dhe ripërdorimin e fijeve në një 'pool'.",
                    example: "ExecutorService executor = Executors.newFixedThreadPool(4);"
                }
            ]
        },
        {
            section: "6. Java Streams & Functional Programming",
            topics: [
                {
                    term: "Streams API",
                    definition: "Mënyrë deklarative për të përpunuar koleksione përmes tubacioneve (filter, map, collect).",
                    example: "List<String> res = list.stream().filter(s -> s.startsWith('X')).collect(Collectors.toList());"
                },
                {
                    term: "Optional Class",
                    definition: "Kontejner që shmang NullPointerException duke menaxhuar vlerat që mund të jenë null.",
                    example: "Optional<String> opt = Optional.ofNullable(getName());"
                }
            ]
        },
        {
            section: "7. Modern Java Features (Java 17 - Java 21+)",
            topics: [
                {
                    term: "Records",
                    definition: "Klasa të pandryshueshme për mbajtjen e të dhënave që gjenerojnë automatikisht constructor, equals dhe toString.",
                    example: "public record UserDto(Long id, String username) {}"
                },
                {
                    term: "Virtual Threads (Project Loom)",
                    definition: "Fije të lehta të menaxhuara nga JVM që lejojnë miliona fije paralele pa konsumuar memorjen e fijeve të OS.",
                    example: "Thread.ofVirtual().start(() -> System.out.println('Virtual Thread'));"
                }
            ]
        },
        {
            section: "8. Spring Boot & Enterprise Ecosystem",
            topics: [
                {
                    term: "Dependency Injection (DI)",
                    definition: "Menaxhimi i objekteve (Beans) i kalon Spring, i cili i injekton varësitë automatikisht.",
                    example: "@Service public class UserService { private final UserRepository repo; ... }"
                },
                {
                    term: "Hibernate & JPA (ORM)",
                    definition: "Standardi për lidhjen e tabelave relacionale SQL me klasat Java.",
                    example: "@Entity @Table(name = 'users') public class User { @Id private Long id; }"
                }
            ]
        }
    ]
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = javaMasterKnowledge;
}

