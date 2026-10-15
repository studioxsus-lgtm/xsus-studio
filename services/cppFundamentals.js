// ============================================================================
// XSUS AI - C++ PROGRAMMING & MEMORY MANAGEMENT MASTER KNOWLEDGE BASE
// Version: 2.0.0 (Bilingual Structured Engine with Analysis)
// ============================================================================

export const cppFundamentalsKnowledge = {
  id: "cpp-fundamentals",
  title: "C++ Programming & Memory Management Master Knowledge Base",
  title_sq: "Njohuritë Themelore të C++ dhe Menaxhimit të Memories",
  description:
    "Guide to C++ syntax, data types, pointers, references, memory management, OOP, STL, templates, exceptions, modern C++, and best practices.",
  description_sq:
    "Udhëzues për sintaksën C++, tipet e të dhënave, pointerët, referencat, menaxhimin e memories, OOP, STL, template-t, përjashtimet dhe praktikat më të mira.",
  version: "2.0.0",
  language: ["sq", "en"],

  sections: [
    {
      id: "cpp-intro",
      title: "C++ Introduction and Basic Syntax",
      title_sq: "Hyrje në C++ dhe Sintaksa Bazë",
      content_sq: `
C++ është gjuhë programimi e kompiluar, me qëllim të përgjithshëm dhe me shumë paradigma. Mbështet programimin procedural, të orientuar nga objektet dhe gjenerik.

Përdoret në motorë lojërash, programe sistemore, aplikacione desktop, sisteme të integruara dhe aplikacione ku performanca ka rëndësi.

Elementet bazë:
- #include për të përfshirë header-at.
- main() është pika hyrëse e zakonshme e programit.
- Pikëpresja ; përfundon shumicën e deklaratave.
- Kllapat { } përcaktojnë blloqe kodi.
- std::cout shfaq dalje tekstuale.

Analizë:
Kompiluesi e përkthen kodin burimor në kod të ekzekutueshëm. std:: tregon se cout i përket namespace-it standard.
`,
      content_en: `
C++ is a compiled, general-purpose, multi-paradigm language supporting procedural, object-oriented, and generic programming.

It is used in game engines, system software, desktop applications, embedded systems, and performance-sensitive applications.

Basic elements include #include, main(), semicolons, braces, and std::cout.

Analysis:
The compiler translates source code into executable code. The std:: prefix identifies an element from the standard namespace.
`,
      example: `#include <iostream>

int main() {
    std::cout << "Mire se erdhe ne XSUS AI - C++" << '\\n';
    return 0;
}`,
      analysis: [
        "iostream siguron funksionalitetin bazë të hyrjes dhe daljes.",
        "Ekzekutimi fillon nga main().",
        "Operatori << dërgon tekst te std::cout.",
        "return 0 tregon përfundim të suksesshëm."
      ],
      bestPractices: [
        "Përdor -Wall -Wextra -Wpedantic gjatë kompilimit me GCC ose Clang.",
        "Përdor standarde moderne si C++17 ose C++20 kur mbështeten nga projekti.",
        "Shkruaj kode të lexueshme dhe ndaji në funksione të vogla."
      ]
    },

    {
      id: "cpp-datatypes",
      title: "Data Types and Variables",
      title_sq: "Tipet e të Dhënave dhe Variablat",
      content_sq: `
C++ është gjuhë me tipe statike: tipi i një variabli përcaktohet në deklarim dhe kontrollohet nga kompiluesi.

Tipet kryesore:
- int: numra të plotë.
- long long: numra të plotë me gamë më të madhe.
- float: numra me presje dhjetore me precizion më të ulët.
- double: numra me presje dhjetore me precizion më të lartë.
- char: një karakter.
- bool: true ose false.
- std::string: tekst.
- auto: kompiluesi e nxjerr tipin nga inicializuesi.

Analizë:
Zgjedhja e tipit ndikon në gamën e vlerave, përdorimin e memories dhe operacionet e lejuara. Inicializo variablat para përdorimit.
`,
      content_en: `
C++ is statically typed: a variable's type is specified or deduced at declaration and checked by the compiler.

Common types include int, long long, float, double, char, bool, std::string, and auto.

Analysis:
The selected type affects value range, memory use, and valid operations. Initialize variables before using them.
`,
      example: `#include <iostream>
#include <string>

int main() {
    int age = 30;
    double pi = 3.14159;
    char grade = 'A';
    bool isActive = true;
    std::string name = "Xhevahir";

    std::cout << name << " eshte " << age << " vjec.\\n";
    std::cout << "Pi: " << pi << '\\n';
    std::cout << "Nota: " << grade << '\\n';
    std::cout << std::boolalpha << "Aktiv: " << isActive << '\\n';
    return 0;
}`,
      analysis: [
        "age ruan një numër të plotë.",
        "pi ruan një vlerë me presje dhjetore.",
        "grade ruan një karakter të vetëm në thonjëza teke.",
        "std::boolalpha e shfaq bool si true ose false.",
        "std::string përdoret për tekst dhe kërkon header-in <string>."
      ],
      bestPractices: [
        "Prefero inicializimin me kllapa kaçurrela, p.sh. int count{0};.",
        "Kujdes me konvertimet që humbin informacion.",
        "Përdor emra që shpjegojnë kuptimin e variablave."
      ]
    },

    {
      id: "cpp-operators",
      title: "Operators and Expressions",
      title_sq: "Operatorët dhe Shprehjet",
      content_sq: `
Operatorët kryejnë veprime mbi vlera.

Aritmetikë: +, -, *, / dhe %.
Krahasim: ==, !=, <, >, <= dhe >=.
Logjikë: &&, || dhe !.
Caktim: =, +=, -=, *= dhe /=.

Analizë:
= cakton vlerë; == krahason dy vlera. Pjesëtimi i dy numrave të plotë prodhon rezultat të plotë. Operatori % përdoret me tipe të plota.
`,
      content_en: `
Operators perform operations on values: arithmetic (+, -, *, /, %), comparison (==, !=, <, >, <=, >=), logical (&&, ||, !), and assignment (=, +=, -=, *=, /=).

Analysis:
= assigns a value; == compares values. Dividing two integers produces an integer result. The % operator is used with integral types.
`,
      example: `#include <iostream>

int main() {
    int a = 10;
    int b = 3;

    std::cout << "Mbledhja: " << a + b << '\\n';
    std::cout << "Pjesetimi i plote: " << a / b << '\\n';
    std::cout << "Mbetja: " << a % b << '\\n';
    std::cout << std::boolalpha << "a > b: " << (a > b) << '\\n';
    return 0;
}`,
      analysis: [
        "a + b jep 13.",
        "a / b jep 3, sepse të dy operandët janë int.",
        "a % b jep 1, mbetjen e pjesëtimit.",
        "Kllapat te (a > b) e bëjnë krahasimin të qartë."
      ]
    },

    {
      id: "cpp-control-flow",
      title: "Control Flow",
      title_sq: "Kontrolli i Rrjedhës së Programit",
      content_sq: `
Strukturat e kontrollit përcaktojnë se cili kod ekzekutohet:
- if / else: degëzim sipas kushtit.
- switch: zgjedhje mes rasteve.
- for: cikël, zakonisht për numërim.
- while: përsëritje sa kohë kushti është i vërtetë.
- do-while: ekzekuton trupin të paktën një herë.
- break: përfundon ciklin ose switch-in.
- continue: kalon te përsëritja tjetër.

Analizë:
Kushti i ciklit duhet të ndryshojë siç pritet që cikli të përfundojë.
`,
      content_en: `
Control-flow statements determine which code executes: if/else, switch, for, while, do-while, break, and continue.

Analysis:
Loop conditions should change as intended so loops terminate when expected.
`,
      example: `#include <iostream>

int main() {
    for (int i = 1; i <= 5; ++i) {
        if (i == 3) continue;
        std::cout << i << '\\n';
    }

    int score = 85;
    if (score >= 90) {
        std::cout << "Shkelqyeshem\\n";
    } else if (score >= 60) {
        std::cout << "Kalueshem\\n";
    } else {
        std::cout << "Nuk kalon\\n";
    }
    return 0;
}`,
      analysis: [
        "Cikli for kalon në vlerat 1 deri në 5.",
        "continue anashkalon shfaqjen e numrit 3.",
        "if / else if / else zgjedh një degë sipas pikëve."
      ]
    },

    {
      id: "cpp-functions",
      title: "Functions and Parameter Passing",
      title_sq: "Funksionet dhe Kalimi i Parametrave",
      content_sq: `
Funksionet ndajnë programin në pjesë të ripërdorshme.

Parametrat mund të kalohen:
- Me vlerë: funksioni merr kopje.
- Me referencë: funksioni mund të ndryshojë objektin origjinal.
- Me referencë const: shmang kopjimin dhe nuk lejon ndryshim përmes asaj reference.

Analizë:
Përdor referencë const për objekte të mëdha që vetëm lexohen. Përdor kalim me vlerë për tipe të vogla kur është e përshtatshme.
`,
      content_en: `
Functions divide a program into reusable units. Parameters can be passed by value, by reference, or by const reference.

Analysis:
Use const references for large objects that are only read. Pass small types by value when appropriate.
`,
      example: `#include <iostream>
#include <string>

void greet(const std::string& name) {
    std::cout << "Pershendetje, " << name << "!\\n";
}

int add(int a, int b) {
    return a + b;
}

int main() {
    greet("Arta");
    std::cout << add(4, 6) << '\\n';
    return 0;
}`,
      analysis: [
        "greet merr tekst me referencë const.",
        "add kthen shumën e dy numrave.",
        "return e dërgon rezultatin te thirrësi."
      ]
    },

    {
      id: "cpp-arrays-strings",
      title: "Arrays, Vectors, and Strings",
      title_sq: "Vargjet, Vector dhe Tekstet",
      content_sq: `
std::array është varg me madhësi fikse, std::vector është koleksion dinamik dhe std::string përdoret për tekst.

Indekset fillojnë nga zero. Qasja jashtë kufijve me [] mund të shkaktojë sjellje të papërcaktuar. Metoda at() kontrollon kufijtë dhe mund të hedhë std::out_of_range.

Analizë:
Për koleksione me madhësi që ndryshon, std::vector është zakonisht zgjedhje e mirë fillestare.
`,
      content_en: `
std::array is fixed-size, std::vector is dynamic, and std::string stores text. Indices start at zero. Out-of-bounds access using [] can cause undefined behavior; at() checks bounds and may throw std::out_of_range.

Analysis:
For collections whose size changes, std::vector is usually a good default choice.
`,
      example: `#include <array>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::array<int, 3> fixed{10, 20, 30};
    std::vector<int> values{1, 2, 3};
    std::string text = "C++";

    values.push_back(4);
    std::cout << fixed.at(1) << '\\n';
    std::cout << values.at(3) << '\\n';
    std::cout << text << '\\n';
    return 0;
}`,
      analysis: [
        "fixed ka gjithmonë tre elemente.",
        "push_back shton një element në fund të vector-it.",
        "at(3) kthen elementin e katërt të values, sepse indekset fillojnë nga zero."
      ]
    },

    {
      id: "cpp-pointers-references",
      title: "Pointers and References",
      title_sq: "Pointerët dhe Referencat",
      content_sq: `
Pointer-i ruan adresën e një objekti. Operatori & merr adresën; operatori * dereferon pointer-in.

Referenca është alias për një objekt ekzistues dhe duhet të inicializohet kur deklarohet.

Rreziqet përfshijnë dereferencimin e nullptr, përdorimin e pointer-it pas përfundimit të jetëgjatësisë së objektit, pointer-at e painicializuar dhe qasjen jashtë kufijve.

Analizë:
Pointer-i mund të jetë nullptr dhe mund të ridrejtohet. Referenca lidhet me një objekt gjatë inicializimit dhe nuk mund të ridrejtohet më pas.
`,
      content_en: `
A pointer stores an object's address. & obtains an address; * dereferences a pointer. A reference is an alias for an existing object and must be initialized.

Hazards include dereferencing nullptr, using dangling pointers, uninitialized pointers, and out-of-bounds access.

Analysis:
A pointer can be nullptr and reassigned. A reference binds to an object at initialization and cannot later be reseated.
`,
      example: `#include <iostream>

int main() {
    int x = 42;
    int* ptr = &x;
    int& ref = x;

    *ptr = 50;
    ref = 100;

    std::cout << "Vlera e x: " << x << '\\n';
    std::cout << "Adresa: " << ptr << '\\n';
    std::cout << "Vlera permes pointer-it: " << *ptr << '\\n';
    return 0;
}`,
      analysis: [
        "ptr ruan adresën e x.",
        "*ptr qaset te vlera në atë adresë.",
        "ref është emër tjetër për x.",
        "Ndryshimet përmes ptr ose ref ndryshojnë të njëjtin objekt x."
      ],
      bestPractices: [
        "Inicializo pointer-at me nullptr ose adresë të vlefshme.",
        "Mos dereferenco pointer që mund të jetë i pavlefshëm.",
        "Prefero referenca kur objekti duhet të ekzistojë.",
        "Mos kthe adresën e një variabli lokal pas përfundimit të funksionit."
      ]
    },

    {
      id: "cpp-memory-management",
      title: "Dynamic Memory, RAII, and Smart Pointers",
      title_sq: "Memoria Dinamike, RAII dhe Smart Pointers",
      content_sq: `
RAII (Resource Acquisition Is Initialization) lidh zotërimin e një burimi me jetëgjatësinë e një objekti. Kur objekti shkatërrohet, burimi lirohet automatikisht.

Smart pointers:
- std::unique_ptr: pronësi ekskluzive.
- std::shared_ptr: pronësi e përbashkët.
- std::weak_ptr: referencë jo-zotëruese ndaj objektit të menaxhuar nga shared_ptr.

Analizë:
Prefero std::make_unique dhe std::make_shared. Këto mjete e bëjnë pronësinë më të qartë dhe ulin rrezikun e rrjedhjes së memories. Përdorimi i drejtpërdrejtë i new/delete duhet të jetë i rrallë.
`,
      content_en: `
RAII ties resource ownership to an object's lifetime. When the object is destroyed, its resource is released automatically.

Smart pointers:
- std::unique_ptr: exclusive ownership.
- std::shared_ptr: shared ownership.
- std::weak_ptr: non-owning reference to an object managed by shared_ptr.

Analysis:
Prefer std::make_unique and std::make_shared. They clarify ownership and reduce memory-leak risks. Direct use of new/delete should be rare.
`,
      example: `#include <iostream>
#include <memory>

class Resource {
public:
    Resource() { std::cout << "Burimi u krijua\\n"; }
    ~Resource() { std::cout << "Burimi u lirua\\n"; }

    void use() const {
        std::cout << "Burimi po perdoret\\n";
    }
};

int main() {
    auto resource = std::make_unique<Resource>();
    resource->use();
    // resource lirohet automatikisht ne fund te scope-it.
    return 0;
}`,
      analysis: [
        "std::make_unique krijon objektin dhe ia jep pronësinë unique_ptr.",
        "Operatori -> thërret metodën e objektit.",
        "Kur resource del nga scope-i, destruktori thirret automatikisht.",
        "Nuk nevojitet delete manual."
      ],
      bestPractices: [
        "Përdor RAII për memorie, skedarë, mutex-a dhe burime të tjera.",
        "Prefero unique_ptr kur ekziston një pronar i vetëm.",
        "Përdor shared_ptr vetëm kur pronësia e përbashkët është e nevojshme.",
        "Shmang ciklet e shared_ptr; weak_ptr mund të ndihmojë në ndërprerjen e tyre."
      ]
    },

    {
      id: "cpp-oop",
      title: "Object-Oriented Programming",
      title_sq: "Programimi i Orientuar nga Objektet",
      content_sq: `
Konceptet kryesore:
1. Enkapsulimi: kontrolli i qasjes me public, private dhe protected.
2. Abstraksioni: ekspozimi i ndërfaqes pa zbuluar hollësitë e implementimit.
3. Trashëgimia: krijimi i klasave të derivuara.
4. Polimorfizmi: sjellje të ndryshme përmes një ndërfaqeje të përbashkët.

Analizë:
Klasat grupojnë të dhëna dhe funksione. Të dhënat private ndihmojnë në ruajtjen e gjendjes së vlefshme të objektit.
`,
      content_en: `
Core concepts:
1. Encapsulation: control access using public, private, and protected.
2. Abstraction: expose an interface while hiding implementation details.
3. Inheritance: derive new classes.
4. Polymorphism: provide different behavior through a common interface.

Analysis:
Classes group data and functions. Private data helps preserve valid object state.
`,
      example: `#include <iostream>
#include <string>

class Person {
private:
    std::string name;
    int age;

public:
    Person(const std::string& personName, int personAge)
        : name(personName), age(personAge) {}

    void introduce() const {
        std::cout << "Une jam " << name
                  << " dhe jam " << age << " vjec.\\n";
    }
};

int main() {
    Person person("Arta", 25);
    person.introduce();
    return 0;
}`,
      analysis: [
        "name dhe age janë private dhe nuk qasen drejtpërdrejt jashtë klasës.",
        "Konstruktori inicializon anëtarët përmes listës së inicializimit.",
        "introduce() shfaq të dhënat e objektit.",
        "person është një instancë e klasës Person."
      ],
      bestPractices: [
        "Mbaji të dhënat private kur nuk duhet të ekspozohen drejtpërdrejt.",
        "Inicializo anëtarët në listën e inicializimit të konstruktorit.",
        "Sigurohu që objektet të fillojnë në një gjendje të vlefshme."
      ]
    },

    {
      id: "cpp-inheritance-polymorphism",
      title: "Inheritance and Polymorphism",
      title_sq: "Trashëgimia dhe Polimorfizmi",
      content_sq: `
Trashëgimia lejon që një klasë e derivuar të ripërdorë sjelljen e një klase bazë.

Polimorfizmi dinamik realizohet përmes funksioneve virtuale. Kur një klasë përdoret si ndërfaqe polimorfike, destruktori i saj zakonisht duhet të jetë virtual.

Fjalët kyçe:
- virtual: mundëson thirrjen dinamike të funksioneve.
- override: tregon se funksioni mbishkruan një funksion virtual të klasës bazë.
- final: parandalon mbishkrimin ose trashëgiminë e mëtejshme në kontekstin përkatës.

Analizë:
Përmes një pointer-i ose reference ndaj klasës bazë, programi mund të thërrasë implementimin e klasës së derivuar.
`,
      content_en: `
Inheritance allows a derived class to reuse behavior from a base class.

Dynamic polymorphism uses virtual functions. If a class is used as a polymorphic interface, its destructor should generally be virtual.

Keywords:
- virtual enables dynamic dispatch.
- override marks an overriding function.
- final prevents further overriding or derivation in the relevant context.

Analysis:
A pointer or reference to a base class can invoke the derived implementation.
`,
      example: `#include <iostream>
#include <memory>

class Animal {
public:
    virtual void speak() const {
        std::cout << "Animal sound\\n";
    }

    virtual ~Animal() = default;
};

class Dog : public Animal {
public:
    void speak() const override {
        std::cout << "Woof!\\n";
    }
};

int main() {
    std::unique_ptr<Animal> animal = std::make_unique<Dog>();
    animal->speak();
    return 0;
}`,
      analysis: [
        "Dog trashëgon nga Animal.",
        "speak() është virtual në klasën bazë.",
        "override tregon se Dog zëvendëson implementimin e speak().",
        "Thirrja animal->speak() ekzekuton implementimin e Dog.",
        "Destruktori virtual mundëson shkatërrimin e sigurt përmes pointer-it të klasës bazë."
      ],
      bestPractices: [
        "Përdor override për funksionet e mbishkruara.",
        "Përdor destruktor virtual në klasat bazë polimorfike.",
        "Prefero kompozimin në vend të trashëgimisë kur marrëdhënia 'është një' nuk është e përshtatshme."
      ]
    },

    {
      id: "cpp-stl",
      title: "Standard Template Library (STL)",
      title_sq: "Biblioteka Standarde STL",
      content_sq: `
STL përmban kontejnerë, iteratorë, algoritme dhe mjete të tjera të ripërdorshme.

Kontejnerë të zakonshëm:
- std::vector: sekuencë dinamike.
- std::map: çifte çelës-vlerë të renditura sipas çelësit.
- std::unordered_map: çifte çelës-vlerë me kërkim të bazuar në hash.
- std::set: koleksion çelësash unikë të renditur.
- std::queue: strukturë FIFO.
- std::stack: strukturë LIFO.

Algoritme të zakonshme përfshijnë std::sort, std::find dhe std::count. Shumica kërkojnë iteratorë si kufij të intervalit.

Analizë:
Prefero algoritmet standarde në vend të implementimeve manuale kur ato e shprehin qartë qëllimin.
`,
      content_en: `
The STL provides reusable containers, iterators, algorithms, and utilities.

Common containers:
- std::vector: dynamic sequence.
- std::map: ordered key-value pairs.
- std::unordered_map: hash-based key-value lookup.
- std::set: sorted collection of unique keys.
- std::queue: FIFO structure.
- std::stack: LIFO structure.

Common algorithms include std::sort, std::find, and std::count. Many algorithms use iterators to define a range.

Analysis:
Prefer standard algorithms over handwritten implementations when they clearly express the intent.
`,
      example: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers{5, 2, 8, 1, 3};

    std::sort(numbers.begin(), numbers.end());

    for (int value : numbers) {
        std::cout << value << ' ';
    }
    std::cout << '\\n';

    auto found = std::find(numbers.begin(), numbers.end(), 3);
    if (found != numbers.end()) {
        std::cout << "U gjet: " << *found << '\\n';
    }

    return 0;
}`,
      analysis: [
        "sort rendit elementet në rritje.",
        "begin() dhe end() përcaktojnë intervalin e algoritmit.",
        "find kthen iteratorin te elementi ose end() nëse nuk gjendet.",
        "Kontrolli found != numbers.end() parandalon dereferencimin e iteratorit fundor."
      ],
      bestPractices: [
        "Përdor algoritmet e bibliotekës standarde kur janë të përshtatshme.",
        "Kontrollo iteratorët para dereferencimit.",
        "Zgjidh kontejnerin sipas operacioneve që përdor programi më shpesh."
      ]
    },

    {
      id: "cpp-templates",
      title: "Templates and Generic Programming",
      title_sq: "Templates dhe Programimi Gjenerik",
      content_sq: `
Templates lejojnë krijimin e funksioneve dhe klasave që punojnë me tipe të ndryshme.

Function template:
Një funksion i përgjithshëm që parametrizohet me tipin e të dhënave.

Class template:
Një klasë që mund të përdoret me tipe të ndryshme.

Analizë:
Kompiluesi zakonisht krijon implementimin e përshtatshëm kur template instancohet me një tip konkret. Në C++20, concepts mund të kufizojnë tipet që pranohen.
`,
      content_en: `
Templates allow functions and classes to work with different types.

A function template defines a generic function. A class template defines a generic class.

Analysis:
The compiler generally instantiates a suitable implementation for each concrete template argument. In C++20, concepts can constrain accepted types.
`,
      example: `#include <iostream>
#include <string>

template <typename T>
T maximum(T a, T b) {
    return (a < b) ? b : a;
}

int main() {
    std::cout << maximum(3, 7) << '\\n';
    std::cout << maximum(2.5, 1.8) << '\\n';
    std::cout << maximum(std::string("ana"),
                         std::string("bora")) << '\\n';
    return 0;
}`,
      analysis: [
        "typename T deklaron një parametër tipi.",
        "maximum punon me tipe që mbështesin krahasimin e përdorur.",
        "Dy argumentet zakonisht duhet të përputhen me të njëjtin T në këtë shembull.",
        "Template zvogëlon nevojën për kopjim të të njëjtit algoritëm për tipe të ndryshme."
      ]
    },

    {
      id: "cpp-exceptions",
      title: "Exception Handling",
      title_sq: "Trajtimi i Përjashtimeve",
      content_sq: `
Përjashtimet përdoren për të raportuar gabime ose situata të jashtëzakonshme.

- try: përmban kodin që mund të hedhë përjashtim.
- throw: hedh një përjashtim.
- catch: kap dhe trajton një përjashtim.

Përjashtimet duhet të kapen sipas tipit dhe zakonisht me referencë const për të shmangur kopjimin e panevojshëm. Një catch (...) mund të përdoret kur nevojitet kapja e çdo përjashtimi.

Analizë:
RAII ndihmon në lirimin e burimeve edhe kur rrjedha e programit ndërpritet nga një përjashtim.
`,
      content_en: `
Exceptions report errors or exceptional conditions.

- try contains code that may throw.
- throw raises an exception.
- catch handles a matching exception.

Exceptions are commonly caught by const reference to avoid unnecessary copying. catch (...) can catch any exception when necessary.

Analysis:
RAII helps release resources even when control flow is interrupted by an exception.
`,
      example: `#include <iostream>
#include <stdexcept>

double divide(double a, double b) {
    if (b == 0.0) {
        throw std::invalid_argument("Pjestimi me zero");
    }
    return a / b;
}

int main() {
    try {
        std::cout << divide(10.0, 2.0) << '\\n';
        std::cout << divide(10.0, 0.0) << '\\n';
    } catch (const std::invalid_argument& error) {
        std::cerr << "Gabim: " << error.what() << '\\n';
    }

    return 0;
}`,
      analysis: [
        "divide hedh std::invalid_argument kur emëruesi është zero.",
        "Pas throw, ekzekutimi vazhdon te blloku catch përkatës.",
        "error.what() jep një përshkrim tekstual të gabimit.",
        "std::cerr përdoret për mesazhe gabimi."
      ],
      bestPractices: [
        "Hidh tipe përjashtimesh që shpjegojnë qartë problemin.",
        "Kapo përjashtimet me const reference kur është e përshtatshme.",
        "Mos përdor përjashtime për rrjedhën normale të programit.",
        "Shmang kapjen e përjashtimeve pa i trajtuar ose pa i përcjellë më tej."
      ]
    },

    {
      id: "cpp-file-io",
      title: "File Input and Output",
      title_sq: "Leximi dhe Shkrimi në Skedarë",
      content_sq: `
C++ përdor bibliotekën <fstream> për të punuar me skedarë.

- std::ifstream: lexon nga skedari.
- std::ofstream: shkruan në skedar.
- std::fstream: mundëson lexim dhe shkrim.

Kontrollo nëse skedari është hapur me sukses. Objektet e rrjedhave i mbyllin automatikisht skedarët kur shkatërrohen.

Analizë:
Përdor RAII për të menaxhuar jetëgjatësinë e skedarit dhe kontrollo gjendjen e rrjedhës pas operacioneve të rëndësishme.
`,
      content_en: `
C++ uses <fstream> for file operations.

- std::ifstream reads from a file.
- std::ofstream writes to a file.
- std::fstream supports both reading and writing.

Check whether a file opened successfully. Stream objects close files automatically when destroyed.

Analysis:
Use RAII to manage file lifetime and check stream state after important operations.
`,
      example: `#include <fstream>
#include <iostream>
#include <string>

int main() {
    {
        std::ofstream output("shembull.txt");
        if (!output) {
            std::cerr << "Skedari nuk u hap per shkrim.\\n";
            return 1;
        }
        output << "Pershendetje nga C++!\\n";
    }

    {
        std::ifstream input("shembull.txt");
        if (!input) {
            std::cerr << "Skedari nuk u hap per lexim.\\n";
            return 1;
        }

        std::string line;
        while (std::getline(input, line)) {
            std::cout << line << '\\n';
        }
    }

    return 0;
}`,
      analysis: [
        "ofstream hap skedarin për shkrim dhe, në këtë rast, e krijon nëse nevojitet.",
        "if (!output) kontrollon nëse hapja ka dështuar.",
        "getline lexon tekst rresht pas rreshti.",
        "Skedarët mbyllen automatikisht kur objektet dalin nga scope-i."
      ],
      bestPractices: [
        "Kontrollo gjithmonë nëse skedari hapet me sukses.",
        "Përdor getline për të lexuar rreshta teksti.",
        "Zgjidh mënyrën e hapjes sipas nevojës: lexim, shkrim ose shtim në fund."
      ]
    },

    {
      id: "cpp-modern",
      title: "Modern C++ Features",
      title_sq: "Veçoritë e C++ Modern",
      content_sq: `
C++11 dhe versionet pasuese shtuan veçori që e bëjnë kodin më të sigurt dhe më shprehës.

Veçori të rëndësishme:
- auto: dedukton tipin nga inicializuesi.
- nullptr: paraqet pointer-in null.
- range-based for: kalon nëpër elementet e një koleksioni.
- lambda: funksione anonime që mund të kapin variabla.
- move semantics: mundësojnë transferimin e burimeve.
- std::optional (C++17): përfaqëson një vlerë që mund të mungojë.
- concepts (C++20): kufizojnë parametrat e template-ve.

Analizë:
Përdor veçoritë moderne kur përmirësojnë qartësinë dhe sigurinë e kodit. Kontrollo versionin e standardit të kompiluesit.
`,
      content_en: `
C++11 and later standards introduced features that make code safer and more expressive.

Important features include auto, nullptr, range-based for, lambdas, move semantics, std::optional (C++17), and concepts (C++20).

Analysis:
Use modern features when they improve clarity and safety. Check the compiler's selected language standard.
`,
      example: `#include <iostream>
#include <optional>
#include <string>
#include <utility>

std::optional<int> parsePositive(int value) {
    if (value > 0) {
        return value;
    }
    return std::nullopt;
}

int main() {
    auto message = std::string("C++ modern");
    auto length = message.size();

    for (char ch : message) {
        std::cout << ch << ' ';
    }
    std::cout << "\\nGjatesia: " << length << '\\n';

    auto result = parsePositive(8);
    if (result.has_value()) {
        std::cout << "Vlera: " << *result << '\\n';
    }

    auto movedMessage = std::move(message);
    std::cout << movedMessage << '\\n';
    return 0;
}`,
      analysis: [
        "auto dedukton tipin nga inicializuesi.",
        "range-based for kalon nëpër karakteret e tekstit.",
        "std::optional<int> mund të përmbajë një int ose të mos përmbajë vlerë.",
        "std::move e kthen shprehjen në një vlerë që lejon lëvizjen; vetë transferimi kryhet nga operacioni përkatës.",
        "Pas lëvizjes, objekti burimor mbetet i vlefshëm, por gjendja e tij mund të ndryshojë."
      ]
    },

    {
      id: "cpp-memory-safety",
      title: "Memory Safety and Undefined Behavior",
      title_sq: "Siguria e Memories dhe Sjellja e Papërcaktuar",
      content_sq: `
Sjellja e papërcaktuar (undefined behavior, UB) ndodh kur programi shkel kërkesat e standardit C++.

Shembuj të zakonshëm:
- Qasja jashtë kufijve të një vargu.
- Dereferencimi i pointer-it null ose të pavlefshëm.
- Përdorimi i një objekti pas përfundimit të jetëgjatësisë së tij.
- Leximi i një vlere të painicializuar në mënyrë të palejuar.
- Shkelja e kërkesave për sinkronizimin e memories.

Analizë:
Kompiluesi nuk është i detyruar ta zbulojë ose të raportojë UB. Programi mund të japë rezultate të paparashikueshme ose të duket sikur funksionon, por të dështojë në kushte të tjera.
`,
      content_en: `
Undefined behavior (UB) occurs when a program violates the C++ standard's requirements.

Common examples include out-of-bounds access, dereferencing invalid pointers, using objects after their lifetime, invalid reads of uninitialized values, and violating memory synchronization requirements.

Analysis:
The compiler is not required to detect or report UB. The program may behave unpredictably or appear to work before failing under different conditions.
`,
      example: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{10, 20, 30};

    // Qasje e kontrolluar: at() kontrollon kufijte.
    try {
        std::cout << values.at(1) << '\\n';
        std::cout << values.at(5) << '\\n';
    } catch (const std::out_of_range& error) {
        std::cerr << "Indeks i pavlefshem: "
                  << error.what() << '\\n';
    }

    return 0;
}`,
      analysis: [
        "values.at(1) kthen elementin e dytë.",
        "values.at(5) hedh std::out_of_range sepse indeksi është jashtë kufijve.",
        "Blloku catch e trajton gabimin në vend që të vazhdojë me qasje të pavlefshme."
      ],
      bestPractices: [
        "Prefero kontejnerët dhe abstraksionet standarde ndaj menaxhimit manual të memories.",
        "Përdor at() kur kontrolli i kufijve është i dobishëm.",
        "Aktivizo paralajmërimet e kompiluesit dhe përdor sanitizers gjatë testimit.",
        "Mos supozo se një program është i saktë vetëm sepse përfundon pa gabime."
      ]
    },

    {
      id: "cpp-concurrency",
      title: "Concurrency and Multithreading",
      title_sq: "Konkurrenca dhe Programimi me Shumë Threads",
      content_sq: `
C++ ofron mjete për ekzekutimin e punëve në threads të ndryshëm.

Elementet kryesore:
- std::thread: nis një thread.
- std::mutex: mbron të dhënat e përbashkëta nga qasja e njëkohshme.
- std::lock_guard: e merr mutex-in dhe e liron automatikisht.
- std::scoped_lock: mund të kyçë disa mutex-a në mënyrë të sigurt.
- std::atomic: mundëson operacione atomike për tipe të përshtatshme.
- std::async dhe std::future: ndihmojnë në nisjen e punës dhe marrjen e rezultatit.

Analizë:
Qasja e pakontrolluar e disa threads te të njëjtat të dhëna mund të krijojë data race. Në C++, një data race që nuk është e sinkronizuar siç duhet shkakton sjellje të papërcaktuar.
`,
      content_en: `
C++ provides tools for executing work on multiple threads.

Key components include std::thread, std::mutex, std::lock_guard, std::scoped_lock, std::atomic, std::async, and std::future.

Analysis:
Uncontrolled concurrent access to shared data can cause a data race. In C++, an unsynchronized data race causes undefined behavior.
`,
      example: `#include <iostream>
#include <mutex>
#include <thread>

int counter = 0;
std::mutex counterMutex;

void increment() {
    for (int i = 0; i < 10000; ++i) {
        std::lock_guard<std::mutex> lock(counterMutex);
        ++counter;
    }
}

int main() {
    std::thread first(increment);
    std::thread second(increment);

    first.join();
    second.join();

    std::cout << "Counter: " << counter << '\\n';
    return 0;
}`,
      analysis: [
        "Dy threads ekzekutojnë funksionin increment.",
        "mutex mbron ndryshimin e counter nga qasja e njëkohshme.",
        "lock_guard e liron mutex-in automatikisht në fund të scope-it.",
        "join pret që thread-i përkatës të përfundojë.",
        "Rezultati i pritshëm është 20000."
      ],
      bestPractices: [
        "Minimizo të dhënat e përbashkëta të ndryshueshme.",
        "Përdor RAII për menaxhimin e mutex-ave.",
        "Sigurohu që çdo thread të përfundojë para se të shkatërrohen burimet që përdor.",
        "Mos mbaj mutex të kyçur më gjatë se sa nevojitet.",
        "Përdor std::atomic për gjendje të thjeshta atomike kur është e përshtatshme."
      ]
    },

    {
      id: "cpp-tooling",
      title: "Compilers, Build Systems, and Debugging",
      title_sq: "Kompiluesit, Sistemet e Ndërtimit dhe Debugging",
      content_sq: `
Kodi C++ zakonisht përpunohet nga një kompilues si GCC, Clang ose MSVC.

Shembull kompilimi me GCC ose Clang:
g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o program

Ekzekutimi në Linux ose macOS:
./program

Mjetet e dobishme:
- CMake: konfigurimi i procesit të ndërtimit.
- GDB ose LLDB: debugging.
- AddressSanitizer: zbulimi i shumë gabimeve të memories.
- UndefinedBehaviorSanitizer: zbulimi i disa rasteve të sjelljes së papërcaktuar.
- Testet automatike: verifikimi i sjelljes së programit.

Analizë:
Paralajmërimet ndihmojnë në gjetjen e problemeve para ekzekutimit. Sanitizers janë mjete testimi dhe nuk provojnë se programi është plotësisht i sigurt.
`,
      content_en: `
C++ code is commonly compiled with GCC, Clang, or MSVC.

Example using GCC or Clang:
g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o program

Useful tools include CMake, GDB, LLDB, AddressSanitizer, UndefinedBehaviorSanitizer, and automated tests.

Analysis:
Warnings help detect problems before execution. Sanitizers are testing tools and do not prove that a program is completely safe.
`,
      example: `// main.cpp
#include <iostream>

int main() {
    std::cout << "Hello, C++20!\\n";
    return 0;
}

// Kompilimi:
// g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o program

// Ekzekutimi ne Linux/macOS:
// ./program`,
      analysis: [
        "-std=c++20 zgjedh standardin C++20.",
        "-Wall dhe -Wextra aktivizojnë shumë paralajmërime të dobishme.",
        "-Wpedantic kërkon paralajmërime për disa përdorime që nuk përputhen me standardin.",
        "Programi i kompiluar ruhet te skedari i specifikuar me -o."
      ],
      bestPractices: [
        "Aktivizo paralajmërimet gjatë zhvillimit.",
        "Përdor një standard të përcaktuar C++ për projektin.",
        "Testo me sanitizers kur mbështeten nga mjedisi.",
        "Përdor debugger për të inspektuar gjendjen dhe rrjedhën e programit.",
        "Automatizo ndërtimin dhe testet në projekte më të mëdha."
      ]
    },

    {
      id: "cpp-best-practices",
      title: "C++ Best Practices",
      title_sq: "Praktikat më të Mira në C++",
      content_sq: `
Parime të rëndësishme për kod C++ të mirëmbajtshëm:

1. Prefero tipet dhe kontejnerët e bibliotekës standarde.
2. Përdor RAII për burimet.
3. Prefero std::unique_ptr kur nevojitet pronësi dinamike ekskluzive.
4. Përdor const për të shprehur të dhënat që nuk duhet të ndryshojnë.
5. Shmang new dhe delete manual kur abstraksionet standarde janë të mjaftueshme.
6. Mbaj funksionet të qarta dhe me përgjegjësi të kufizuar.
7. Trajto gabimet në mënyrë të qëndrueshme.
8. Shkruaj teste dhe aktivizo paralajmërimet.
9. Përdor emra që shpjegojnë qëllimin.
10. Mos optimizo para se të kesh prova se ekziston problem performance.

Analizë:
Kodi i mirë nuk është vetëm kod që kompiluesi e pranon. Ai duhet të jetë i lexueshëm, i testueshëm, i sigurt dhe i lehtë për t'u mirëmbajtur.
`,
      content_en: `
Important principles for maintainable C++:

1. Prefer standard-library types and containers.
2. Use RAII for resource management.
3. Prefer std::unique_ptr for exclusive dynamic ownership.
4. Use const to express values that should not change.
5. Avoid manual new/delete when standard abstractions are sufficient.
6. Keep functions clear and focused.
7. Handle errors consistently.
8. Write tests and enable warnings.
9. Choose names that communicate intent.
10. Avoid premature optimization.

Analysis:
Good code is not merely code that compiles. It should be readable, testable, safe, and maintainable.
`,
      example: `#include <iostream>
#include <string>
#include <vector>

void printNames(const std::vector<std::string>& names) {
    for (const std::string& name : names) {
        std::cout << name << '\\n';
    }
}

int main() {
    const std::vector<std::string> names{
        "Arta", "Beni", "Drita"
    };

    printNames(names);
    return 0;
}`,
      analysis: [
        "printNames merr koleksionin me referencë const, duke shmangur kopjimin e vector-it.",
        "const shpreh se funksioni nuk duhet ta ndryshojë koleksionin përmes kësaj reference.",
        "Range-based for e bën kalimin nëpër elemente të lexueshëm.",
        "Funksioni ka një përgjegjësi të qartë: shfaqjen e emrave."
      ],
      bestPractices: [
        "Prefero std::vector dhe std::string në vend të vargjeve manuale kur janë të përshtatshme.",
        "Përdor const reference për koleksione të mëdha që vetëm lexohen.",
        "Përdor emra domethënës dhe formatim të qëndrueshëm.",
        "Mbështetu te testet për të verifikuar sjelljen."
      ]
    },

    {
      id: "cpp-glossary",
      title: "C++ Glossary",
      title_sq: "Fjalori i C++",
      content_sq: "Termat kryesorë të C++ me përkufizime në shqip dhe anglisht.",
      content_en: "Key C++ terms with definitions in Albanian and English.",
      terms: [
        {
          term: "Variable",
          definition_sq: "Emër që i referohet një objekti ose vlere të ruajtur.",
          definition_en: "A name referring to a stored object or value."
        },
        {
          term: "Data Type",
          definition_sq: "Përcakton llojin e vlerave që mund të përfaqësojë një objekt.",
          definition_en: "Defines the kind of values an object can represent."
        },
        {
          term: "Function",
          definition_sq: "Bllok kodi i ripërdorshëm që kryen një detyrë.",
          definition_en: "A reusable block of code that performs a task."
        },
        {
          term: "Pointer",
          definition_sq: "Objekt që ruan adresën e një objekti tjetër ose vlerën null.",
          definition_en: "An object storing the address of another object or a null value."
        },
        {
          term: "Reference",
          definition_sq: "Emër alternativ për një objekt ekzistues.",
          definition_en: "An alias for an existing object."
        },
        {
          term: "RAII",
          definition_sq: "Teknikë që lidh zotërimin e burimeve me jetëgjatësinë e objekteve.",
          definition_en: "A technique that ties resource ownership to object lifetime."
        },
        {
          term: "Smart Pointer",
          definition_sq: "Objekt që menaxhon pronësinë dhe jetëgjatësinë e objektit të adresuar.",
          definition_en: "An object that manages ownership and lifetime of a pointed-to object."
        },
        {
          term: "STL",
          definition_sq: "Biblioteka standarde e kontejnerëve, algoritmeve dhe iteratorëve të bazuar në template.",
          definition_en: "Standard library facilities for containers, algorithms, and iterators built around templates."
        },
        {
          term: "Class",
          definition_sq: "Tip i përcaktuar nga përdoruesi që bashkon të dhëna dhe funksione.",
          definition_en: "A user-defined type that groups data and functions."
        },
        {
          term: "Object",
          definition_sq: "Instancë e një tipi ose klase.",
          definition_en: "An instance of a type or class."
        },
        {
          term: "Inheritance",
          definition_sq: "Mekanizëm për krijimin e klasave të derivuara nga klasa bazë.",
          definition_en: "A mechanism for deriving classes from a base class."
        },
        {
          term: "Polymorphism",
          definition_sq: "Përdorimi i një ndërfaqeje të përbashkët për sjellje të ndryshme.",
          definition_en: "Using a common interface for different behaviors."
        },
        {
          term: "Template",
          definition_sq: "Mekanizëm për kod gjenerik të parametrizuar sipas tipeve ose vlerave.",
          definition_en: "A mechanism for generic code parameterized by types or values."
        },
        {
          term: "Iterator",
          definition_sq: "Objekt që përdoret për të kaluar nëpër elementet e një koleksioni.",
          definition_en: "An object used to traverse elements in a collection."
        },
        {
          term: "Undefined Behavior",
          definition_sq: "Sjellje për të cilën standardi C++ nuk përcakton rezultat të kërkuar.",
          definition_en: "Behavior for which the C++ standard imposes no requirements on the result."
        },
        {
          term: "Move Semantics",
          definition_sq: "Mekanizëm që mundëson transferimin e burimeve nga një objekt te tjetri.",
          definition_en: "A mechanism that allows resources to be transferred between objects."
        },
        {
          term: "Exception",
          definition_sq: "Mekanizëm për sinjalizimin dhe trajtimin e situatave të jashtëzakonshme.",
          definition_en: "A mechanism for signaling and handling exceptional conditions."
        },
        {
          term: "Data Race",
          definition_sq: "Qasje konkurrente e pasinkronizuar në të njëjtën memorie ku të paktën një qasje shkruan.",
          definition_en: "Unsynchronized concurrent access to the same memory location where at least one access writes."
        }
      ]
    }
  ]
};

// CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = cppFundamentalsKnowledge;
}
