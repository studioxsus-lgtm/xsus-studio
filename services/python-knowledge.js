
 // ============================================================================
 // XSUS AI - PYTHON MASTER KNOWLEDGE BASE
 // Version: 7.0.0 (Bilingual Structured Engine)
 // ============================================================================

export const pythonMasterKnowledge = {
  // 1. BAZAT E PYTHON-IT / PYTHON FUNDAMENTALS
  fundamentals: {
    title: { sq: "Bazat e Python-it", en: "Python Fundamentals" },
    topics: {
      introduction: {
        sq: "Python është gjuhë programimi e nivelit të lartë, me sintaksë të lexueshme, që përdoret për automatizim, aplikacione, analizë të dhënash dhe shumë qëllime të tjera.",
        en: "Python is a high-level programming language with readable syntax, used for automation, applications, data analysis, and many other purposes."
      },
      variables: {
        sq: "Variablat krijohen duke u caktuar vlerë me operatorin =. Python nuk kërkon deklarim paraprak të variablave.",
        en: "Variables are created by assigning a value with =. Python does not require prior variable declarations."
      },
      dataTypes: {
        sq: "Llojet bazë përfshijnë int, float, complex, str, bool, list, tuple, range, dict, set, frozenset, bytes, bytearray dhe NoneType.",
        en: "Built-in types include int, float, complex, str, bool, list, tuple, range, dict, set, frozenset, bytes, bytearray, and NoneType."
      },
      comments: {
        sq: "Komentet me një rresht fillojnë me #. Dokumentimi i funksioneve dhe klasave zakonisht bëhet me docstrings brenda thonjëzave të trefishta.",
        en: "Single-line comments begin with #. Functions and classes are commonly documented with docstrings inside triple quotes."
      },
      indentation: {
        sq: "Indentimi përcakton blloqet e kodit. Përdor zakonisht katër hapësira dhe mos përziej tab-et me hapësirat.",
        en: "Indentation defines code blocks. Usually use four spaces and do not mix tabs with spaces."
      }
    },
    example: `
name = "Arta"
age = 20
is_student = True

print(name, age, is_student)
`
  },

  // 2. SINTAKSA DHE FJALËT KYÇE / SYNTAX AND KEYWORDS
  syntax: {
    title: { sq: "Sintaksa dhe fjalët kyçe", en: "Syntax and Keywords" },
    topics: {
      keywords: {
        sq: "Fjalët kyçe si if, else, for, while, def, class, return, import, try, except, with, async dhe await kanë kuptime të veçanta.",
        en: "Keywords such as if, else, for, while, def, class, return, import, try, except, with, async, and await have special meanings."
      },
      naming: {
        sq: "Emrat e variablave dallojnë shkronjat e mëdha nga të voglat, nuk mund të fillojnë me numër dhe nuk mund të jenë fjalë kyçe.",
        en: "Variable names are case-sensitive, cannot begin with a digit, and cannot be reserved keywords."
      },
      conventions: {
        sq: "PEP 8 rekomandon emra_snake_case për variabla dhe funksione, si dhe PascalCase për emrat e klasave.",
        en: "PEP 8 recommends snake_case for variables and functions, and PascalCase for class names."
      }
    },
    example: `
user_name = "Arta"

def greet_user(name):
    return f"Përshëndetje, {name}"

print(greet_user(user_name))
`
  },

  // 3. OPERATORËT / OPERATORS
  operators: {
    title: { sq: "Operatorët", en: "Operators" },
    topics: {
      arithmetic: {
        sq: "Operatorët aritmetikë janë +, -, *, /, //, %, dhe **. Operatori // bën pjesëtim në dysheme, ndërsa ** llogarit fuqinë.",
        en: "Arithmetic operators are +, -, *, /, //, %, and **. The // operator performs floor division, while ** calculates exponentiation."
      },
      comparison: {
        sq: "Operatorët e krahasimit janë ==, !=, <, >, <= dhe >=. Ata prodhojnë vlera Boolean.",
        en: "Comparison operators are ==, !=, <, >, <=, and >=. They produce Boolean values."
      },
      logical: {
        sq: "Operatorët logjikë janë and, or dhe not.",
        en: "Logical operators are and, or, and not."
      },
      identity: {
        sq: "is dhe is not kontrollojnë identitetin e objekteve, jo thjesht barazinë e vlerave.",
        en: "is and is not check object identity, not merely value equality."
      },
      membership: {
        sq: "in dhe not in kontrollojnë nëse një element gjendet në një koleksion ose sekuencë.",
        en: "in and not in check whether an element exists in a collection or sequence."
      },
      assignment: {
        sq: "Operatorët e caktimit përfshijnë =, +=, -=, *=, /=, //=, %= dhe **=.",
        en: "Assignment operators include =, +=, -=, *=, /=, //=, %=, and **=."
      }
    },
    example: `
a = 10
b = 3

print(a + b)
print(a // b)
print(a ** b)
print(a > b and b > 0)
`
  },

  // 4. KUSHTET / CONDITIONALS
  conditionals: {
    title: { sq: "Kushtet", en: "Conditionals" },
    topics: {
      ifElse: {
        sq: "if, elif dhe else lejojnë ekzekutimin e blloqeve të ndryshme sipas kushteve.",
        en: "if, elif, and else execute different blocks according to conditions."
      },
      truthiness: {
        sq: "Vlerat 0, 0.0, '', [], {}, set() dhe None konsiderohen False në kontekst Boolean.",
        en: "Values such as 0, 0.0, '', [], {}, set(), and None are false in Boolean contexts."
      },
      conditionalExpression: {
        sq: "Shprehja kushtore përdor formën value_if_true if condition else value_if_false.",
        en: "A conditional expression uses the form value_if_true if condition else value_if_false."
      },
      matchCase: {
        sq: "match dhe case, të disponueshme nga Python 3.10, mundësojnë përputhjen strukturore të modeleve.",
        en: "match and case, available from Python 3.10, enable structural pattern matching."
      }
    },
    example: `
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
else:
    grade = "C"

print(grade)
`
  },

  // 5. CIKLET / LOOPS
  loops: {
    title: { sq: "Ciklet", en: "Loops" },
    topics: {
      forLoop: {
        sq: "for kalon nëpër elementet e një objekti të iterueshëm.",
        en: "for iterates over the elements of an iterable."
      },
      whileLoop: {
        sq: "while përsërit një bllok përderisa kushti është i vërtetë.",
        en: "while repeats a block while its condition is true."
      },
      breakContinue: {
        sq: "break përfundon ciklin, continue kalon te përsëritja tjetër dhe pass nuk bën asnjë veprim.",
        en: "break terminates the loop, continue skips to the next iteration, and pass does nothing."
      },
      enumerate: {
        sq: "enumerate() jep indeksin dhe elementin gjatë kalimit nëpër një sekuencë.",
        en: "enumerate() provides an index and element while iterating over a sequence."
      },
      zip: {
        sq: "zip() bashkon elementet përkatëse nga disa objekte të iterueshme.",
        en: "zip() combines corresponding elements from multiple iterables."
      }
    },
    example: `
fruits = ["Mollë", "Dardhë", "Banane"]

for index, fruit in enumerate(fruits):
    print(index, fruit)
`
  },

  // 6. FUNKSIONET / FUNCTIONS
  functions: {
    title: { sq: "Funksionet", en: "Functions" },
    topics: {
      definition: {
        sq: "Funksionet krijohen me def dhe mund të marrin parametra e të kthejnë rezultate me return.",
        en: "Functions are defined with def and can accept parameters and return results with return."
      },
      arguments: {
        sq: "Python mbështet argumente pozicionale, me emër, parazgjedhore, *args dhe **kwargs.",
        en: "Python supports positional, keyword, default, *args, and **kwargs arguments."
      },
      lambda: {
        sq: "lambda krijon një funksion anonim me një shprehje.",
        en: "lambda creates an anonymous function consisting of a single expression."
      },
      recursion: {
        sq: "Rekursioni ndodh kur një funksion thërret vetveten; duhet të ketë kusht përfundimi.",
        en: "Recursion occurs when a function calls itself; it must have a terminating condition."
      },
      annotations: {
        sq: "Type annotations dokumentojnë llojet e pritshme të parametrave dhe rezultateve, por zakonisht nuk imponohen automatikisht gjatë ekzekutimit.",
        en: "Type annotations document expected parameter and return types, but are not usually enforced automatically at runtime."
      },
      docstrings: {
        sq: "Docstrings dokumentojnë qëllimin, parametrat dhe rezultatin e funksioneve.",
        en: "Docstrings document the purpose, parameters, and return value of functions."
      }
    },
    example: `
def multiply(a: int, b: int = 2) -> int:
    """Kthen prodhimin e dy numrave."""
    return a * b

print(multiply(5))
print(multiply(5, 3))
`
  },

  // 7. STRING-ET / STRINGS
  strings: {
    title: { sq: "Teksti dhe vargjet", en: "Strings" },
    topics: {
      immutability: {
        sq: "String-et janë të pandryshueshme; operacionet krijojnë string të ri në vend që të ndryshojnë atë ekzistues.",
        en: "Strings are immutable; operations create new strings instead of modifying the existing one."
      },
      slicing: {
        sq: "Slicing përdor formën teksti[start:stop:step] për të marrë pjesë të string-ut.",
        en: "Slicing uses the form text[start:stop:step] to extract parts of a string."
      },
      formatting: {
        sq: "f-strings lejojnë vendosjen e shprehjeve brenda tekstit përmes kllapave gjarpërore.",
        en: "f-strings allow embedding expressions in text using curly braces."
      },
      methods: {
        sq: "Metodat e zakonshme përfshijnë lower(), upper(), strip(), split(), join(), replace(), find() dhe startswith().",
        en: "Common methods include lower(), upper(), strip(), split(), join(), replace(), find(), and startswith()."
      },
      encoding: {
        sq: "encode() shndërron tekstin në bytes, ndërsa decode() shndërron bytes në tekst sipas kodimit të zgjedhur.",
        en: "encode() converts text to bytes, while decode() converts bytes to text using the selected encoding."
      }
    },
    example: `
name = "  XSUS AI  "
clean_name = name.strip()
message = f"Përshëndetje, {clean_name}!"
print(message)
`
  },

  // 8. KOLEKSIONET / COLLECTIONS
  collections: {
    title: { sq: "Koleksionet", en: "Collections" },
    topics: {
      lists: {
        sq: "Listat janë koleksione të renditura dhe të ndryshueshme që lejojnë dublikate.",
        en: "Lists are ordered, mutable collections that allow duplicates."
      },
      tuples: {
        sq: "Tuple janë koleksione të renditura dhe të pandryshueshme.",
        en: "Tuples are ordered and immutable collections."
      },
      sets: {
        sq: "Set ruan elemente unike dhe mbështet bashkimin, prerjen dhe diferencën.",
        en: "Sets store unique elements and support union, intersection, and difference."
      },
      dictionaries: {
        sq: "dict ruan çifte çelës-vlerë dhe përdoret për kërkim sipas çelësit.",
        en: "dict stores key-value pairs and is used for lookup by key."
      },
      comprehensions: {
        sq: "List, set dhe dictionary comprehensions krijojnë koleksione në mënyrë koncize.",
        en: "List, set, and dictionary comprehensions create collections concisely."
      },
      unpacking: {
        sq: "Unpacking shpërndan elementet e një koleksioni në variabla të veçantë.",
        en: "Unpacking assigns elements from a collection to separate variables."
      }
    },
    example: `
numbers = [1, 2, 3, 4, 5]
squares = [number ** 2 for number in numbers]

person = {"name": "Arta", "age": 25}
print(squares)
print(person["name"])
`
  },

  // 9. KOLEKSIONET E AVANCUARA / ADVANCED COLLECTIONS
  advancedCollections: {
    title: { sq: "Koleksionet e avancuara", en: "Advanced Collections" },
    topics: {
      deque: {
        sq: "collections.deque mundëson shtim dhe heqje efikase nga të dy skajet.",
        en: "collections.deque enables efficient appending and popping from both ends."
      },
      counter: {
        sq: "collections.Counter numëron shfaqjet e elementeve.",
        en: "collections.Counter counts occurrences of elements."
      },
      defaultdict: {
        sq: "collections.defaultdict siguron vlerë parazgjedhore për çelësa që mungojnë.",
        en: "collections.defaultdict provides a default value for missing keys."
      },
      namedTuple: {
        sq: "namedtuple krijon tuple me fusha të emërtuara.",
        en: "namedtuple creates tuples with named fields."
      },
      heapq: {
        sq: "heapq ofron operacione për strukturën heap, e dobishme për radhë me përparësi.",
        en: "heapq provides heap operations, useful for priority queues."
      }
    },
    example: `
from collections import Counter, deque

counts = Counter(["a", "b", "a"])
queue = deque([1, 2, 3])
queue.appendleft(0)

print(counts)
print(queue)
`
  },

  // 10. DICTIONARY DHE SET / DICTIONARIES AND SETS
  dictionariesAndSets: {
    title: { sq: "Fjalorët dhe bashkësitë", en: "Dictionaries and Sets" },
    topics: {
      dictionaryMethods: {
        sq: "get(), keys(), values(), items(), update() dhe setdefault() janë metoda të rëndësishme të dict.",
        en: "get(), keys(), values(), items(), update(), and setdefault() are important dict methods."
      },
      setOperations: {
        sq: "Set-et mbështesin union, intersection, difference dhe symmetric difference.",
        en: "Sets support union, intersection, difference, and symmetric difference."
      },
      hashability: {
        sq: "Çelësat e dictionary dhe elementet e set duhet të jenë të hashueshëm.",
        en: "Dictionary keys and set elements must be hashable."
      }
    }
  },

  // 11. OOP / OBJECT-ORIENTED PROGRAMMING
  objectOrientedProgramming: {
    title: { sq: "Programimi i orientuar nga objektet", en: "Object-Oriented Programming" },
    topics: {
      classesObjects: {
        sq: "class përcakton një klasë, ndërsa instancat e saj janë objekte. __init__ inicializon gjendjen e objektit.",
        en: "class defines a class, while its instances are objects. __init__ initializes object state."
      },
      inheritance: {
        sq: "Trashëgimia lejon një klasë të marrë sjellje nga një klasë tjetër.",
        en: "Inheritance allows a class to acquire behavior from another class."
      },
      polymorphism: {
        sq: "Polimorfizmi lejon objekte të ndryshme të ofrojnë metoda me të njëjtën ndërfaqe.",
        en: "Polymorphism allows different objects to provide methods with the same interface."
      },
      encapsulation: {
        sq: "Encapsulation organizon të dhënat dhe sjelljen brenda klasave. Emrat me një ose dy nënviza ndihmojnë në shënimin e konventave të privatësisë.",
        en: "Encapsulation organizes data and behavior within classes. Single or double leading underscores help indicate privacy conventions."
      },
      properties: {
        sq: "@property lejon përdorimin e metodave përmes sintaksës së atributeve.",
        en: "@property allows methods to be accessed using attribute syntax."
      },
      dataclasses: {
        sq: "dataclasses mund të gjenerojë automatikisht metoda si __init__ dhe __repr__ për klasa që ruajnë të dhëna.",
        en: "dataclasses can automatically generate methods such as __init__ and __repr__ for data-holding classes."
      },
      magicMethods: {
        sq: "Metodat speciale si __str__, __repr__, __len__ dhe __eq__ përcaktojnë sjellje të personalizuara të objekteve.",
        en: "Special methods such as __str__, __repr__, __len__, and __eq__ define customized object behavior."
      }
    },
    example: `
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "Tingull"

class Dog(Animal):
    def speak(self):
        return "Leh"

dog = Dog("Bubi")
print(dog.name, dog.speak())
`
  },

  // 12. MODULLET DHE PAKETAT / MODULES AND PACKAGES
  modulesAndPackages: {
    title: { sq: "Modulet dhe paketat", en: "Modules and Packages" },
    topics: {
      imports: {
        sq: "import dhe from ... import përdoren për të ripërdorur kod nga module të tjera.",
        en: "import and from ... import are used to reuse code from other modules."
      },
      mainGuard: {
        sq: "if __name__ == '__main__': ekzekuton kodin vetëm kur skedari niset drejtpërdrejt.",
        en: "if __name__ == '__main__': runs code only when the file is executed directly."
      },
      packages: {
        sq: "Paketat organizojnë modulet në struktura drejtorish dhe mund të përmbajnë skedarin __init__.py.",
        en: "Packages organize modules in directory structures and may contain an __init__.py file."
      },
      virtualEnvironments: {
        sq: "venv krijon mjedise të izoluara për varësitë e projektit.",
        en: "venv creates isolated environments for project dependencies."
      },
      pip: {
        sq: "pip instalon dhe menaxhon paketat Python.",
        en: "pip installs and manages Python packages."
      }
    },
    example: `
def main():
    print("XSUS AI - Python")

if __name__ == "__main__":
    main()
`
  },

  // 13. FILE I/O / SKEDARËT
  fileIO: {
    title: { sq: "Leximi dhe shkrimi i skedarëve", en: "File Input and Output" },
    topics: {
      open: {
        sq: "open() hap skedarë në mënyra si r, w, a dhe b. Përdor encoding='utf-8' për tekst.",
        en: "open() opens files in modes such as r, w, a, and b. Use encoding='utf-8' for text."
      },
      contextManager: {
        sq: "with mbyll automatikisht skedarin edhe kur ndodh përjashtim.",
        en: "with automatically closes the file even if an exception occurs."
      },
      pathlib: {
        sq: "pathlib.Path ofron një ndërfaqe objektore për rrugët e skedarëve dhe drejtorive.",
        en: "pathlib.Path provides an object-oriented interface for file and directory paths."
      },
      serialization: {
        sq: "json përdoret për serializim të dhënash të përshtatshme për shkëmbim. pickle nuk duhet përdorur me të dhëna të pabesuara.",
        en: "json is used to serialize data suitable for exchange. pickle should not be used with untrusted data."
      }
    },
    example: `
from pathlib import Path

path = Path("note.txt")
path.write_text("Përshëndetje XSUS AI", encoding="utf-8")
text = path.read_text(encoding="utf-8")
print(text)
`
  },

  // 14. GABIMET DHE PËRJASHTIMET / EXCEPTIONS
  exceptions: {
    title: { sq: "Gabimet dhe përjashtimet", en: "Errors and Exceptions" },
    topics: {
      tryExcept: {
        sq: "try dhe except trajtojnë përjashtimet që ndodhin gjatë ekzekutimit.",
        en: "try and except handle exceptions that occur during execution."
      },
      elseFinally: {
        sq: "else ekzekutohet kur nuk ndodh përjashtim në bllokun try; finally ekzekutohet në fund.",
        en: "else runs when no exception occurs in try; finally runs at the end."
      },
      raise: {
        sq: "raise ngre një përjashtim.",
        en: "raise throws an exception."
      },
      customExceptions: {
        sq: "Përjashtimet e personalizuara krijohen duke trashëguar zakonisht nga Exception.",
        en: "Custom exceptions are commonly created by inheriting from Exception."
      }
    },
    example: `
try:
    value = int("abc")
except ValueError as error:
    print("Vlerë e pavlefshme:", error)
finally:
    print("Përfundoi kontrolli")
`
  },

  // 15. ITERATORËT DHE GJENERATORËT / ITERATORS AND GENERATORS
  iteratorsAndGenerators: {
    title: { sq: "Iteratorët dhe gjeneratorët", en: "Iterators and Generators" },
    topics: {
      iterable: {
        sq: "Një iterable është objekt mbi të cilin mund të kalojë një cikël for.",
        en: "An iterable is an object that can be traversed by a for loop."
      },
      iteratorProtocol: {
        sq: "__iter__() dhe __next__() përbëjnë protokollin bazë të iteratorëve.",
        en: "__iter__() and __next__() form the basic iterator protocol."
      },
      generators: {
        sq: "Funksionet me yield prodhojnë vlera gradualisht dhe kursejnë memorie për sekuenca të mëdha.",
        en: "Functions using yield produce values gradually and save memory for large sequences."
      },
      generatorExpressions: {
        sq: "Generator expressions përdorin kllapa të rrumbullakëta për prodhim dembel të vlerave.",
        en: "Generator expressions use parentheses for lazy value production."
      }
    },
    example: `
def count_up_to(limit):
    number = 1
    while number <= limit:
        yield number
        number += 1

for item in count_up_to(3):
    print(item)
`
  },

  // 16. PROGRAMIMI FUNKSIONAL / FUNCTIONAL PROGRAMMING
  functionalProgramming: {
    title: { sq: "Programimi funksional", en: "Functional Programming" },
    topics: {
      mapFilter: {
        sq: "map() transformon elementet, ndërsa filter() zgjedh elementet që plotësojnë një kusht.",
        en: "map() transforms elements, while filter() selects elements that satisfy a condition."
      },
      reduce: {
        sq: "functools.reduce() kombinon elementet e një sekuence në një rezultat të vetëm.",
        en: "functools.reduce() combines sequence elements into a single result."
      },
      pureFunctions: {
        sq: "Funksionet e pastra japin të njëjtin rezultat për të njëjtën hyrje dhe shmangin efektet anësore.",
        en: "Pure functions return the same result for the same input and avoid side effects."
      },
      closures: {
        sq: "Closure ruan qasje te variablat e funksionit përreth edhe pasi funksioni përreth ka përfunduar.",
        en: "A closure retains access to variables from an enclosing function after that function has finished."
      }
    },
    example: `
numbers = [1, 2, 3, 4, 5]
squares = list(map(lambda n: n * n, numbers))
evens = list(filter(lambda n: n % 2 == 0, numbers))

print(squares, evens)
`
  },

  // 17. DEKORATUESIT / DECORATORS
  decorators: {
    title: { sq: "Dekoruesit", en: "Decorators" },
    topics: {
      functionDecorators: {
        sq: "Dekoruesit mbështjellin funksione ose klasa për të zgjeruar sjelljen e tyre pa ndryshuar kodin origjinal.",
        en: "Decorators wrap functions or classes to extend their behavior without changing the original code."
      },
      wraps: {
        sq: "functools.wraps ruan metadata si emri dhe dokumentimi i funksionit origjinal.",
        en: "functools.wraps preserves metadata such as the original function name and documentation."
      },
      property: {
        sq: "@property krijon atribute të llogaritura dhe mund të kombinohet me setter.",
        en: "@property creates computed attributes and can be combined with a setter."
      },
      staticAndClassMethods: {
        sq: "@staticmethod nuk merr automatikisht self ose cls, ndërsa @classmethod merr klasën si cls.",
        en: "@staticmethod receives neither self nor cls automatically, while @classmethod receives the class as cls."
      }
    },
    example: `
from functools import wraps

def announce(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print("Po ekzekutohet funksioni")
        return func(*args, **kwargs)
    return wrapper

@announce
def greet():
    return "Përshëndetje"

print(greet())
`
  },

  // 18. MENAXHIMI I KONTEKSTIT / CONTEXT MANAGERS
  contextManagers: {
    title: { sq: "Menaxhuesit e kontekstit", en: "Context Managers" },
    topics: {
      withStatement: {
        sq: "with siguron menaxhim të burimeve, si skedarët dhe lidhjet, me pastrim të kontrolluar.",
        en: "with provides resource management, such as files and connections, with controlled cleanup."
      },
      enterExit: {
        sq: "__enter__() përgatit kontekstin dhe __exit__() kryen pastrimin.",
        en: "__enter__() prepares the context and __exit__() performs cleanup."
      },
      contextlib: {
        sq: "contextlib ofron mjete për krijimin dhe kombinimin e menaxhuesve të kontekstit.",
        en: "contextlib provides tools for creating and combining context managers."
      }
    },
    example: `
from contextlib import contextmanager

@contextmanager
def simple_context():
    print("Fillimi")
    try:
        yield
    finally:
        print("Pastrimi")

with simple_context():
    print("Brenda kontekstit")
`
  },

  // 19. PROGRAMIMI ASINKRON / ASYNC PROGRAMMING
  asynchronous: {
    title: { sq: "Programimi asinkron", en: "Asynchronous Programming" },
    topics: {
      asyncAwait: {
        sq: "async def përcakton funksion asinkron, ndërsa await pret rezultatin e një operacioni të pritshëm pa bllokuar ciklin asinkron.",
        en: "async def defines an asynchronous function, while await waits for an awaitable operation without blocking the asynchronous event loop."
      },
      asyncio: {
        sq: "asyncio ofron mjete për ekzekutimin e detyrave asinkrone, veçanërisht për operacione hyrje-daljeje.",
        en: "asyncio provides tools for running asynchronous tasks, especially for input/output operations."
      },
      tasks: {
        sq: "Task-et planifikojnë coroutines që të ekzekutohen nga event loop.",
        en: "Tasks schedule coroutines to run on the event loop."
      },
      gather: {
        sq: "asyncio.gather() mundëson pritjen e disa operacioneve asinkrone.",
        en: "asyncio.gather() allows waiting for multiple asynchronous operations."
      },
      concurrencyVsParallelism: {
        sq: "Concurrency menaxhon disa detyra që përparojnë gjatë së njëjtës periudhë; parallelism ekzekuton punë realisht në të njëjtën kohë.",
        en: "Concurrency manages multiple tasks making progress over the same period; parallelism executes work at the same time."
      }
    },
    example: `
import asyncio

async def work():
    await asyncio.sleep(1)
    return "Përfundoi"

async def main():
    result = await work()
    print(result)

asyncio.run(main())
`
  },

  // 20. THREADING DHE MULTIPROCESSING
  concurrency: {
    title: { sq: "Threading dhe multiprocessing", en: "Threading and Multiprocessing" },
    topics: {
      threading: {
        sq: "threading përdor thread-e brenda të njëjtit proces dhe është i dobishëm për shumë operacione I/O.",
        en: "threading uses threads within the same process and is useful for many I/O operations."
      },
      multiprocessing: {
        sq: "multiprocessing përdor procese të ndara dhe mund të shfrytëzojë bërthama të shumta për punë CPU-intensive.",
        en: "multiprocessing uses separate processes and can use multiple cores for CPU-intensive work."
      },
      gil: {
        sq: "Në implementimin standard CPython, GIL kufizon ekzekutimin paralel të bytecode Python nga thread-et në shumë skenarë CPU-bound; sjellja mund të ndryshojë sipas versionit dhe ndërtimit.",
        en: "In standard CPython, the GIL limits parallel execution of Python bytecode by threads in many CPU-bound scenarios; behavior can vary by version and build."
      },
      synchronization: {
        sq: "Lock, Event, Semaphore dhe Queue ndihmojnë në koordinimin e thread-eve dhe proceseve.",
        en: "Lock, Event, Semaphore, and Queue help coordinate threads and processes."
      }
    }
  },

  // 21. TIPIZIMI / TYPE HINTS
  typeHints: {
    title: { sq: "Shënimet e tipeve", en: "Type Hints" },
    topics: {
      annotations: {
        sq: "Type hints dokumentojnë llojet e pritshme dhe ndihmojnë analizuesit statikë.",
        en: "Type hints document expected types and help static analyzers."
      },
      generics: {
        sq: "Generics lejojnë shkrimin e strukturave dhe funksioneve të ripërdorshme që punojnë me tipe të ndryshme.",
        en: "Generics allow reusable structures and functions that work with different types."
      },
      optionalUnion: {
        sq: "Union shpreh disa tipe të mundshme, ndërsa None duhet përfshirë kur vlera mund të mungojë.",
        en: "Union expresses multiple possible types, while None should be included when a value may be absent."
      },
      protocols: {
        sq: "Protocol përshkruan sjelljen që duhet të ofrojë një objekt pa kërkuar trashëgimi konkrete.",
        en: "Protocol describes behavior an object should provide without requiring concrete inheritance."
      }
    },
    example: `
def describe(value: str | int) -> str:
    return f"Vlera: {value}"

print(describe("Python"))
print(describe(10))
`
  },

  // 22. TESTIMI / TESTING
  testing: {
    title: { sq: "Testimi", en: "Testing" },
    topics: {
      unittest: {
        sq: "unittest është kornizë e integruar për testimin e njësive.",
        en: "unittest is a built-in framework for unit testing."
      },
      pytest: {
        sq: "pytest është mjet i jashtëm i njohur që thjeshton testet dhe raportimin.",
        en: "pytest is a popular external tool that simplifies tests and reporting."
      },
      assertions: {
        sq: "assert kontrollon nëse një kusht është i vërtetë; nëse jo, ngre AssertionError.",
        en: "assert checks whether a condition is true; otherwise, it raises AssertionError."
      },
      mocking: {
        sq: "Mocking zëvendëson varësitë reale me objekte të kontrolluara gjatë testimit.",
        en: "Mocking replaces real dependencies with controlled objects during testing."
      }
    },
    example: `
def add(a, b):
    return a + b

def test_add():
    assert add(2, 3) == 5
`
  },

  // 23. DEBUGGING DHE LOGGING
  debuggingAndLogging: {
    title: { sq: "Debugging dhe regjistrimi i ngjarjeve", en: "Debugging and Logging" },
    topics: {
      pdb: {
        sq: "pdb lejon ndalimin e ekzekutimit, inspektimin e variablave dhe kalimin hap pas hapi në kod.",
        en: "pdb allows pausing execution, inspecting variables, and stepping through code."
      },
      logging: {
        sq: "logging regjistron ngjarje në nivele si DEBUG, INFO, WARNING, ERROR dhe CRITICAL.",
        en: "logging records events at levels such as DEBUG, INFO, WARNING, ERROR, and CRITICAL."
      },
      tracebacks: {
        sq: "Traceback tregon rrugën e thirrjeve që çoi te një përjashtim.",
        en: "A traceback shows the call path that led to an exception."
      }
    },
    example: `
import logging

logging.basicConfig(level=logging.INFO)
logging.info("Aplikacioni filloi")
`
  },

  // 24. SIGURIA / SECURITY
  security: {
    title: { sq: "Siguria në Python", en: "Python Security" },
    topics: {
      evalExec: {
        sq: "Mos përdor eval() ose exec() me hyrje të pabesuar, sepse mund të ekzekutojnë kod të rrezikshëm.",
        en: "Do not use eval() or exec() with untrusted input because they can execute dangerous code."
      },
      pickle: {
        sq: "Mos çserializo të dhëna pickle nga burime të pabesuara, sepse ngarkimi mund të ekzekutojë kod.",
        en: "Do not deserialize pickle data from untrusted sources because loading it can execute code."
      },
      secrets: {
        sq: "Për token-e dhe sekrete përdor modulin secrets në vend të random.",
        en: "Use the secrets module instead of random for tokens and secrets."
      },
      passwordStorage: {
        sq: "Fjalëkalimet duhet të ruhen me algoritme të përshtatshme hashimi për fjalëkalime, jo si tekst i thjeshtë.",
        en: "Passwords should be stored using suitable password-hashing algorithms, not as plain text."
      }
    }
  },

  // 25. PERFORMANCA / PERFORMANCE
  performance: {
    title: { sq: "Performanca", en: "Performance" },
    topics: {
      profiling: {
        sq: "cProfile dhe timeit ndihmojnë në matjen e kohës dhe identifikimin e pjesëve të ngadalta.",
        en: "cProfile and timeit help measure execution time and identify slow sections."
      },
      caching: {
        sq: "functools.lru_cache ruan rezultatet e thirrjeve të mëparshme të funksioneve.",
        en: "functools.lru_cache stores results of previous function calls."
      },
      algorithmComplexity: {
        sq: "Kompleksiteti kohor dhe hapësinor ndihmon në vlerësimin e shkallëzimit të algoritmeve.",
        en: "Time and space complexity help evaluate algorithm scalability."
      },
      generators: {
        sq: "Gjeneratorët shmangin krijimin e koleksioneve të mëdha në memorie kur vlerat mund të prodhohen një nga një.",
        en: "Generators avoid building large in-memory collections when values can be produced one at a time."
      }
    }
  },

  // 26. MATEMATIKA DHE NUMRAT / MATH AND NUMBERS
  mathematics: {
    title: { sq: "Matematika dhe numrat", en: "Mathematics and Numbers" },
    topics: {
      numericTypes: {
        sq: "Python mbështet int, float dhe complex; Decimal dhe Fraction ofrojnë përfaqësime të tjera numerike.",
        en: "Python supports int, float, and complex; Decimal and Fraction provide other numeric representations."
      },
      mathModule: {
        sq: "math ofron funksione matematikore si sqrt(), ceil(), floor(), sin() dhe log().",
        en: "math provides mathematical functions such as sqrt(), ceil(), floor(), sin(), and log()."
      },
      decimal: {
        sq: "decimal.Decimal është i dobishëm kur kërkohet aritmetikë dhjetore e kontrolluar, si në disa llogaritje financiare.",
        en: "decimal.Decimal is useful when controlled decimal arithmetic is needed, such as in some financial calculations."
      },
      random: {
        sq: "random gjeneron vlera pseudo-rastësore; për përdorim kriptografik përdor secrets.",
        en: "random generates pseudo-random values; use secrets for cryptographic purposes."
      }
    },
    example: `
from decimal import Decimal
from math import sqrt

price = Decimal("0.10") + Decimal("0.20")
print(price)
print(sqrt(81))
`
  },

  // 27. DATA DHE KOHA / DATE AND TIME
  dateTime: {
    title: { sq: "Data dhe koha", en: "Date and Time" },
    topics: {
      datetime: {
        sq: "datetime përfaqëson data dhe kohë; prefero objekte timezone-aware kur zona kohore ka rëndësi.",
        en: "datetime represents dates and times; prefer timezone-aware objects when time zones matter."
      },
      timedelta: {
        sq: "timedelta përfaqëson diferenca kohore dhe përdoret për llogaritje me data.",
        en: "timedelta represents time differences and is used for date calculations."
      },
      timezone: {
        sq: "zoneinfo mbështet zonat kohore të sistemit të bazuara në bazën IANA në versionet moderne të Python-it.",
        en: "zoneinfo supports IANA time zones in modern Python versions."
      }
    },
    example: `
from datetime import datetime, timezone

now = datetime.now(timezone.utc)
print(now.isoformat())
`
  },

  // 28. REGULAR EXPRESSIONS
  regularExpressions: {
    title: { sq: "Shprehjet e rregullta", en: "Regular Expressions" },
    topics: {
      reModule: {
        sq: "Moduli re përdoret për kërkim, përputhje, zëvendësim dhe ndarje teksti sipas modeleve.",
        en: "The re module is used to search, match, replace, and split text using patterns."
      },
      rawStrings: {
        sq: "Raw strings si r'\\d+' ndihmojnë në shkrimin e modeleve me backslash.",
        en: "Raw strings such as r'\\d+' help write patterns containing backslashes."
      },
      compiledPatterns: {
        sq: "re.compile() përgatit një model për përdorim të përsëritur.",
        en: "re.compile() prepares a pattern for repeated use."
      }
    },
    example: `
import re

text = "Porosia 123"
match = re.search(r"\\d+", text)

if match:
    print(match.group())
`
  },

  // 29. JSON DHE FORMATET E TË DHËNAVE / DATA FORMATS
  dataFormats: {
    title: { sq: "JSON dhe formatet e të dhënave", en: "JSON and Data Formats" },
    topics: {
      json: {
        sq: "Moduli json konverton objekte të përshtatshme Python në JSON dhe anasjelltas.",
        en: "The json module converts supported Python objects to JSON and back."
      },
      csv: {
        sq: "Moduli csv lexon dhe shkruan skedarë CSV duke trajtuar ndarësit dhe thonjëzat.",
        en: "The csv module reads and writes CSV files while handling delimiters and quoting."
      },
      serialization: {
        sq: "Serializimi shndërron të dhënat në format që mund të ruhen ose shkëmbehen.",
        en: "Serialization converts data into a format that can be stored or exchanged."
      }
    },
    example: `
import json

data = {"name": "XSUS AI", "active": True}
encoded = json.dumps(data)
decoded = json.loads(encoded)

print(decoded)
`
  },

  // 30. RRJETET DHE HTTP / NETWORKING
  networking: {
    title: { sq: "Rrjetet dhe HTTP", en: "Networking and HTTP" },
    topics: {
      sockets: {
        sq: "socket mundëson komunikim në nivel rrjeti përmes protokolleve si TCP dhe UDP.",
        en: "socket enables network-level communication through protocols such as TCP and UDP."
      },
      urllib: {
        sq: "urllib ofron mjete standarde për punë me URL dhe kërkesa HTTP.",
        en: "urllib provides standard tools for working with URLs and HTTP requests."
      },
      timeouts: {
        sq: "Timeout-et parandalojnë pritjen pa fund për operacione rrjeti.",
        en: "Timeouts prevent waiting indefinitely for network operations."
      },
      tls: {
        sq: "ssl mbështet TLS për komunikime të enkriptuara kur konfigurohet siç duhet.",
        en: "ssl supports TLS for encrypted communications when configured correctly."
      }
    }
  },

  // 31. BAZAT E TË DHËNAVE / DATABASES
  databases: {
    title: { sq: "Bazat e të dhënave", en: "Databases" },
    topics: {
      sqlite: {
        sq: "sqlite3 ofron lidhje me bazat e të dhënave SQLite përmes bibliotekës standarde.",
        en: "sqlite3 provides access to SQLite databases through the standard library."
      },
      transactions: {
        sq: "Transaksionet grupojnë ndryshimet dhe mundësojnë commit ose rollback.",
        en: "Transactions group changes and allow commit or rollback."
      },
      parameterizedQueries: {
        sq: "Përdor pyetje të parametrizuara për të shmangur injektimin SQL; mos bashko hyrje të përdoruesit drejtpërdrejt në SQL.",
        en: "Use parameterized queries to avoid SQL injection; do not concatenate user input directly into SQL."
      }
    },
    example: `
import sqlite3

with sqlite3.connect("app.db") as connection:
    connection.execute(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)"
    )
    connection.execute(
        "INSERT INTO users (name) VALUES (?)",
        ("Arta",)
    )
`
  },

  // 32. WEB DHE API / WEB AND APIs
  webAndAPIs: {
    title: { sq: "Web dhe API", en: "Web and APIs" },
    topics: {
      wsgiAsgi: {
        sq: "WSGI dhe ASGI janë ndërfaqe të zakonshme për lidhjen e aplikacioneve Python me serverë web.",
        en: "WSGI and ASGI are common interfaces for connecting Python applications to web servers."
      },
      rest: {
        sq: "API-të REST zakonisht përdorin metoda HTTP dhe përfaqësime të burimeve.",
        en: "REST APIs commonly use HTTP methods and resource representations."
      },
      validation: {
        sq: "Validimi kontrollon që të dhënat hyrëse të përputhen me strukturën dhe rregullat e pritshme.",
        en: "Validation checks that incoming data matches expected structure and rules."
      }
    }
  },

  // 33. SHKENCË E TË DHËNAVE / DATA SCIENCE
  dataScience: {
    title: { sq: "Shkenca e të dhënave", en: "Data Science" },
    topics: {
      arrays: {
        sq: "NumPy ofron vargje shumëdimensionale dhe operacione numerike të vektorizuara.",
        en: "NumPy provides multidimensional arrays and vectorized numerical operations."
      },
      dataFrames: {
        sq: "Pandas ofron struktura si DataFrame për analizë dhe transformim të të dhënave tabelare.",
        en: "Pandas provides structures such as DataFrame for analyzing and transforming tabular data."
      },
      visualization: {
        sq: "Bibliotekat e vizualizimit paraqesin të dhënat me grafikë për të zbuluar modele dhe prirje.",
        en: "Visualization libraries present data with charts to reveal patterns and trends."
      },
      machineLearning: {
        sq: "Mësimi automatik përdor të dhëna për të trajnuar modele që bëjnë parashikime ose klasifikime.",
        en: "Machine learning uses data to train models that make predictions or classifications."
      }
    }
  },

  // 34. INTELIGJENCA ARTIFICIALE / ARTIFICIAL INTELLIGENCE
  artificialIntelligence: {
    title: { sq: "Inteligjenca artificiale", en: "Artificial Intelligence" },
    topics: {
      modelTraining: {
        sq: "Trajnimi i modelit përshtat parametrat e tij me të dhënat dhe një objektiv optimizimi.",
        en: "Model training adjusts model parameters using data and an optimization objective."
      },
      inference: {
        sq: "Inference është përdorimi i një modeli të trajnuar për të prodhuar rezultate nga hyrje të reja.",
        en: "Inference is the use of a trained model to produce outputs from new inputs."
      },
      evaluation: {
        sq: "Vlerësimi mat cilësinë e modelit me metrika të përshtatshme dhe të dhëna testimi.",
        en: "Evaluation measures model quality using appropriate metrics and test data."
      },
      dataLeakage: {
        sq: "Data leakage ndodh kur informacion nga të dhënat e testimit ose e ardhmja ndikon padrejtësisht në trajnim.",
        en: "Data leakage occurs when test-set or future information improperly influences training."
      }
    }
  },

  // 35. AMBIENTI DHE INSTALIMI / ENVIRONMENT
  environment: {
    title: { sq: "Ambienti dhe instalimi", en: "Environment and Setup" },
    topics: {
      interpreter: {
        sq: "Interpretuesi ekzekuton kodin Python dhe versioni i tij mund të kontrollohet me python --version.",
        en: "The interpreter executes Python code, and its version can be checked with python --version."
      },
      venv: {
        sq: "Mjedisi virtual izolon varësitë e një projekti nga projektet e tjera.",
        en: "A virtual environment isolates a project's dependencies from other projects."
      },
      requirements: {
        sq: "requirements.txt mund të listojë paketat dhe versionet e nevojshme për instalim.",
        en: "requirements.txt can list packages and versions required for installation."
      },
      environmentVariables: {
        sq: "Variablat e ambientit përdoren për konfigurim; sekretet nuk duhen ruajtur në kodin burimor.",
        en: "Environment variables are used for configuration; secrets should not be stored in source code."
      }
    }
  },

  // 36. GIT DHE KONTROLLI I VERSIONEVE / VERSION CONTROL
  versionControl: {
    title: { sq: "Kontrolli i versioneve", en: "Version Control" },
    topics: {
      git: {
        sq: "Git ruan historikun e ndryshimeve dhe ndihmon në bashkëpunimin në kod.",
        en: "Git tracks change history and helps with collaborative coding."
      },
      ignore: {
        sq: ".gitignore përjashton skedarë që nuk duhen ndjekur, si ambientet virtuale dhe skedarët sekretë.",
        en: ".gitignore excludes files that should not be tracked, such as virtual environments and secret files."
      },
      branches: {
        sq: "Degët lejojnë zhvillimin e veçorive pa ndryshuar menjëherë degën kryesore.",
        en: "Branches allow feature development without immediately changing the main branch."
      }
    }
  },

  // 37. DOKUMENTIMI DHE STILI / DOCUMENTATION AND STYLE
  documentation: {
    title: { sq: "Dokumentimi dhe stili", en: "Documentation and Style" },
    topics: {
      pep8: {
        sq: "PEP 8 përshkruan konventat e stilit për kod të lexueshëm dhe të njëtrajtshëm.",
        en: "PEP 8 describes style conventions for readable and consistent code."
      },
      docstrings: {
        sq: "Docstrings shpjegojnë qëllimin, parametrat, vlerat e kthimit dhe përjashtimet e mundshme.",
        en: "Docstrings explain purpose, parameters, return values, and possible exceptions."
      },
      typeChecking: {
        sq: "Analizuesit statikë mund të zbulojnë mospërputhje të tipeve pa ekzekutuar programin.",
        en: "Static analyzers can detect type inconsistencies without executing the program."
      }
    }
  },

  // 38. ARKITEKTURA DHE DIZAJNI / ARCHITECTURE AND DESIGN
  architecture: {
    title: { sq: "Arkitektura dhe dizajni", en: "Architecture and Design" },
    topics: {
      separationOfConcerns: {
        sq: "Ndarja e përgjegjësive e ndan programin në pjesë me role të qarta.",
        en: "Separation of concerns divides a program into parts with clear responsibilities."
      },
      solid: {
        sq: "Parimet SOLID janë udhëzime të dizajnit objektor për mirëmbajtshmëri dhe zgjerueshmëri.",
        en: "SOLID principles are object-oriented design guidelines for maintainability and extensibility."
      },
      dependencyInjection: {
        sq: "Dependency injection ia jep një komponenti varësitë nga jashtë, duke lehtësuar testimin dhe zëvendësimin.",
        en: "Dependency injection supplies a component's dependencies externally, easing testing and replacement."
      },
      designPatterns: {
        sq: "Design patterns janë zgjidhje të përgjithshme për probleme të përsëritura të dizajnit të softuerit.",
        en: "Design patterns are general solutions to recurring software design problems."
      }
    }
  },

  // 39. ALGORITMET DHE STRUKTURAT E TË DHËNAVE / ALGORITHMS
  algorithms: {
    title: { sq: "Algoritmet dhe strukturat e të dhënave", en: "Algorithms and Data Structures" },
    topics: {
      complexity: {
        sq: "Shënimi Big O përshkruan mënyrën si rriten burimet e nevojshme me madhësinë e hyrjes.",
        en: "Big O notation describes how required resources grow with input size."
      },
      searching: {
        sq: "Kërkimi linear kontrollon elementet një nga një; kërkimi binar kërkon sekuencë të renditur.",
        en: "Linear search checks elements one by one; binary search requires a sorted sequence."
      },
      sorting: {
        sq: "Renditja organizon elementet sipas një kriteri; sorted() krijon listë të re dhe list.sort() ndryshon listën ekzistuese.",
        en: "Sorting orders elements by a criterion; sorted() creates a new list and list.sort() modifies the existing list."
      },
      graphAlgorithms: {
        sq: "Grafet modelojnë nyje dhe lidhje; BFS dhe DFS janë mënyra të zakonshme për t'i përshkuar.",
        en: "Graphs model nodes and edges; BFS and DFS are common traversal methods."
      }
    }
  },

  // 40. FJALOR / GLOSSARY
  glossary: [
    {
      term: "Interpreter",
      sq: "Program që ekzekuton kodin Python.",
      en: "A program that executes Python code."
    },
    {
      term: "Mutable",
      sq: "Objekt që mund të ndryshohet pas krijimit.",
      en: "An object that can be modified after creation."
    },
    {
      term: "Immutable",
      sq: "Objekt që nuk ndryshohet pas krijimit.",
      en: "An object that cannot be changed after creation."
    },
    {
      term: "Iterable",
      sq: "Objekt mbi të cilin mund të kalohet me cikël.",
      en: "An object that can be iterated over."
    },
    {
      term: "Iterator",
      sq: "Objekt që prodhon elemente një nga një.",
      en: "An object that produces elements one at a time."
    },
    {
      term: "Coroutine",
      sq: "Funksion asinkron që mund të pezullohet dhe të rifillojë.",
      en: "An asynchronous function that can be suspended and resumed."
    },
    {
      term: "Decorator",
      sq: "Funksion që zgjeron ose ndryshon sjelljen e një funksioni apo klase.",
      en: "A function that extends or changes the behavior of a function or class."
    },
    {
      term: "Exception",
      sq: "Ngjarje që ndërpret rrjedhën normale të ekzekutimit dhe mund të trajtohet.",
      en: "An event that interrupts normal execution and can be handled."
    },
    {
      term: "Virtual Environment",
      sq: "Ambient i izoluar për varësitë e një projekti Python.",
      en: "An isolated environment for a Python project's dependencies."
    },
    {
      term: "Type Hint",
      sq: "Shënim që tregon tipin e pritshëm të një vlere.",
      en: "An annotation indicating the expected type of a value."
    }
  ]
};

// CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = pythonMasterKnowledge;
}
