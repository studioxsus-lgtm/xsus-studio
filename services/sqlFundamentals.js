// ============================================================================
// XSUS AI - SQL & RELATIONAL DATABASES MASTER KNOWLEDGE BASE
// Version: 2.0.0 (Extended Bilingual Structured Engine)
// ============================================================================

export const sqlFundamentalsKnowledge = {
  id: "sql-fundamentals",
  title: "SQL Fundamentals & Relational Databases Master Knowledge Base",
  title_sq: "Njohuritë Themelore të SQL dhe Bazave të të Dhënave Relacionale",
  description:
    "A comprehensive bilingual knowledge base covering relational database concepts, SQL syntax, schema design, constraints, joins, aggregations, transactions, indexing, security, and query optimization.",
  description_sq:
    "Një bazë gjithëpërfshirëse dygjuhëshe për konceptet relacionale, sintaksën SQL, projektimin e skemave, kufizimet, joins, agregimet, transaksionet, indekset, sigurinë dhe optimizimin e pyetjeve.",
  version: "2.0.0",
  language: ["sq", "en"],

  sections: [
    // =====================================================
    // 1. SQL FUNDAMENTALS
    // =====================================================
    {
      id: "sql-fundamentals",
      title: "SQL Fundamentals & Relational Concepts",
      title_sq: "Bazat e SQL dhe Konceptet Relacionale",

      content_sq: `
SQL është gjuhë deklarative për kërkimin dhe menaxhimin e të dhënave në sistemet relacionale.

Konceptet kryesore:
- Table: Koleksion rreshtash dhe kolonash.
- Row: Një rekord në tabelë.
- Column: Një atribut i rekordit.
- Primary Key: Identifikon në mënyrë unike çdo rresht.
- Foreign Key: Zbaton marrëdhënie ndërmjet tabelave.
- Schema: Organizim logjik i objekteve të databazës.
- Constraint: Rregull që kufizon të dhënat e lejuara.

SQL është standard, por disa sintaksa ndryshojnë ndërmjet PostgreSQL, MySQL, SQLite dhe SQL Server.
      `,

      content_en: `
SQL is a declarative language for querying and managing data in relational database systems. Core concepts include tables, rows, columns, primary keys, foreign keys, schemas, and constraints.
      `,

      example: `
CREATE TABLE users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`,

      bestPractices: [
        {
          sq: "Përdor emra të qëndrueshëm dhe të kuptueshëm për tabelat dhe kolonat.",
          en: "Use consistent and descriptive table and column names."
        },
        {
          sq: "Dokumento dialektin SQL që përdor projekti.",
          en: "Document the SQL dialect used by the project."
        }
      ]
    },

    // =====================================================
    // 2. DATABASE DESIGN
    // =====================================================
    {
      id: "database-design",
      title: "Relational Database Design",
      title_sq: "Projektimi i Bazës Relacionale të të Dhënave",

      content_sq: `
Projektimi i databazës përcakton entitetet, atributet, marrëdhëniet dhe kufizimet.

Marrëdhëniet kryesore:
- One-to-One: Një rekord lidhet me një rekord tjetër.
- One-to-Many: Një rekord lidhet me shumë rekorde.
- Many-to-Many: Shumë rekorde lidhen me shumë rekorde përmes një tabele ndërmjetëse.

Në një marrëdhënie many-to-many, tabela lidhëse zakonisht ruan dy foreign keys dhe mund të ketë atribute shtesë.
      `,

      content_en: `
Database design defines entities, attributes, relationships, and integrity constraints. Common relationships include one-to-one, one-to-many, and many-to-many.
      `,

      example: `
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  title VARCHAR(150) NOT NULL
);

CREATE TABLE enrollments (
  student_id INTEGER NOT NULL REFERENCES students(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, course_id)
);
`
    },

    // =====================================================
    // 3. DATA TYPES
    // =====================================================
    {
      id: "data-types",
      title: "SQL Data Types",
      title_sq: "Tipat e të Dhënave në SQL",

      content_sq: `
Tipi i kolonës përcakton format e vlerave që mund të ruhen.

Tipat e zakonshëm:
- INTEGER / BIGINT: Numra të plotë.
- DECIMAL / NUMERIC: Numra me precizion të përcaktuar, të përshtatshëm për shuma financiare.
- REAL / DOUBLE PRECISION: Numra me pikë lëvizëse.
- VARCHAR / TEXT: Tekst.
- DATE: Datë kalendarike.
- TIME: Orë.
- TIMESTAMP: Datë dhe orë.
- BOOLEAN: Vlerë logjike, nëse mbështetet nga dialekti.
- UUID: Identifikues unik, nëse mbështetet.
- JSON / JSONB: Të dhëna JSON, sipas sistemit.

Tipat e disponueshëm dhe sjellja e tyre ndryshojnë sipas DBMS.
      `,

      content_en: `
SQL data types define the values a column can store. Common types include integers, decimals, strings, dates, timestamps, booleans, UUIDs, and JSON variants.
      `,

      example: `
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`
    },

    // =====================================================
    // 4. DDL
    // =====================================================
    {
      id: "ddl-statements",
      title: "Data Definition Language",
      title_sq: "Gjuha e Përkufizimit të të Dhënave",

      content_sq: `
DDL menaxhon strukturën e objekteve të databazës.

Komandat:
- CREATE: Krijon objekte.
- ALTER: Modifikon objekte ekzistuese.
- DROP: Heq objekte.
- TRUNCATE: Heq të dhënat e tabelës, me sjellje që ndryshon sipas DBMS.

Operacionet DDL mund të kenë pasoja të rëndësishme dhe sjellja e transaksioneve DDL ndryshon ndërmjet sistemeve.
      `,

      content_en: `
DDL defines and changes database objects using CREATE, ALTER, DROP, and TRUNCATE. Transactional behavior differs between database systems.
      `,

      example: `
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  action VARCHAR(100) NOT NULL
);

ALTER TABLE audit_logs
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify the target and dependencies before destructive operations.
-- DROP TABLE audit_logs;
`
    },

    // =====================================================
    // 5. DML
    // =====================================================
    {
      id: "dml-statements",
      title: "Data Manipulation Language",
      title_sq: "Gjuha e Manipulimit të të Dhënave",

      content_sq: `
DML manipulon të dhënat në tabela.

Komandat kryesore:
- INSERT: Shton rreshta.
- UPDATE: Përditëson rreshta.
- DELETE: Fshin rreshta.
- MERGE ose UPSERT: Kombinon futjen dhe përditësimin, me sintaksë specifike për DBMS.

Gjithmonë verifiko kushtet dhe numrin e rreshtave të prekur përpara operacioneve kritike.
      `,

      content_en: `
DML changes table data through INSERT, UPDATE, and DELETE. UPSERT and MERGE patterns can combine insert and update behavior, depending on the database system.
      `,

      example: `
INSERT INTO users (id, username, email)
VALUES (1, 'arta', 'arta@example.com');

UPDATE users
SET email = 'arta.new@example.com'
WHERE id = 1;

DELETE FROM users
WHERE id = 1;
`
    },

    // =====================================================
    // 6. SELECT & QUERY ORDER
    // =====================================================
    {
      id: "select-queries",
      title: "SELECT Queries and Logical Processing",
      title_sq: "SELECT dhe Përpunimi Logjik i Pyetjeve",

      content_sq: `
SELECT merr të dhëna nga një ose më shumë burime.

Klauzolat e zakonshme:
- SELECT: Përcakton kolonat ose shprehjet.
- FROM: Përcakton burimin.
- WHERE: Filtron rreshtat.
- GROUP BY: Krijon grupe.
- HAVING: Filtron grupet.
- ORDER BY: Rendit rezultatet.
- LIMIT / OFFSET ose sintaksa ekuivalente: Kufizon rezultatet.

Rendi logjik konceptual nuk është domosdoshmërisht i njëjtë me rendin në të cilin shkruhen klauzolat.
      `,

      content_en: `
SELECT retrieves data from tables or other query sources. Common clauses include FROM, WHERE, GROUP BY, HAVING, ORDER BY, and row-limiting syntax.
      `,

      example: `
SELECT id, username, created_at
FROM users
WHERE created_at >= '2026-01-01'
ORDER BY created_at DESC, id DESC
LIMIT 20;
`
    },

    // =====================================================
    // 7. FILTERING & NULL
    // =====================================================
    {
      id: "filtering-null",
      title: "Filtering, Operators, and NULL Semantics",
      title_sq: "Filtrimi, Operatorët dhe Semantika e NULL",

      content_sq: `
Operatorët kryesorë:
- AND, OR, NOT.
- IN dhe NOT IN.
- BETWEEN.
- LIKE dhe, në disa sisteme, ILIKE.
- IS NULL dhe IS NOT NULL.
- EXISTS dhe NOT EXISTS.

NULL përfaqëson vlerë të panjohur ose të munguar. Krahasimet standarde me NULL nuk prodhojnë TRUE; përdor IS NULL.

Kushtet mund të japin TRUE, FALSE ose UNKNOWN. Prandaj, NOT IN me rezultate që përmbajnë NULL kërkon kujdes.
      `,

      content_en: `
SQL filtering includes logical operators, set membership, ranges, pattern matching, and NULL checks. NULL introduces three-valued logic: TRUE, FALSE, and UNKNOWN.
      `,

      example: `
SELECT id, username
FROM users
WHERE email IS NOT NULL
  AND username LIKE 'a%';

SELECT u.id
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.user_id = u.id
);
`
    },

    // =====================================================
    // 8. AGGREGATION
    // =====================================================
    {
      id: "aggregation",
      title: "Aggregate Functions and Grouping",
      title_sq: "Funksionet e Agregimit dhe Grupimi",

      content_sq: `
Funksionet agreguese llogarisin përmbledhje mbi rreshta.

- COUNT(*): Numëron rreshtat.
- COUNT(column): Numëron vlerat jo-NULL.
- SUM(): Llogarit shumën.
- AVG(): Llogarit mesataren.
- MIN() / MAX(): Gjejnë minimumin dhe maksimumin.

GROUP BY krijon grupe, ndërsa HAVING filtron rezultatet e agreguara.
      `,

      content_en: `
Aggregate functions summarize rows. COUNT(*) counts rows, while COUNT(column) excludes NULL values. GROUP BY forms groups and HAVING filters grouped results.
      `,

      example: `
SELECT
  status,
  COUNT(*) AS user_count,
  MIN(created_at) AS first_created
FROM users
GROUP BY status
HAVING COUNT(*) >= 5
ORDER BY user_count DESC;
`
    },

    // =====================================================
    // 9. JOINS
    // =====================================================
    {
      id: "joins",
      title: "SQL Joins",
      title_sq: "Bashkimet në SQL",

      content_sq: `
JOIN bashkon rreshta nga disa burime.

- INNER JOIN: Vetëm përputhjet.
- LEFT JOIN: Të gjithë rreshtat e majtë dhe përputhjet e djathta.
- RIGHT JOIN: Të gjithë rreshtat e djathtë dhe përputhjet e majta.
- FULL OUTER JOIN: Rreshtat nga të dyja anët, me ose pa përputhje.
- CROSS JOIN: Prodhimi Kartezian.
- SELF JOIN: Bashkimi i një tabele me vetveten.

Kushtet në WHERE mund të heqin rreshtat NULL të një LEFT JOIN dhe ta ndryshojnë efektivisht rezultatin.
      `,

      content_en: `
Joins combine related data from multiple sources. Choose join types carefully, especially when preserving unmatched rows with outer joins.
      `,

      example: `
SELECT
  u.id,
  u.username,
  o.id AS order_id,
  o.total_amount
FROM users u
LEFT JOIN orders o
  ON o.user_id = u.id
ORDER BY u.id;
`
    },

    // =====================================================
    // 10. SUBQUERIES & CTE
    // =====================================================
    {
      id: "subqueries-ctes",
      title: "Subqueries and Common Table Expressions",
      title_sq: "Subqueries dhe CTE",

      content_sq: `
Subquery është një pyetje e vendosur brenda një pyetjeje tjetër.

CTE përdor WITH për të emërtuar një rezultat të ndërmjetëm dhe për ta bërë pyetjen më të lexueshme.

Recursive CTE mund të përdoret për hierarki dhe struktura grafike të caktuara.

CTE nuk garanton automatikisht materializim ose performancë më të mirë; optimizimi varet nga DBMS.
      `,

      content_en: `
Subqueries nest queries within other statements. CTEs provide named intermediate query results and recursive CTEs can represent hierarchies.
      `,

      example: `
WITH user_totals AS (
  SELECT
    user_id,
    SUM(total_amount) AS total_spent
  FROM orders
  GROUP BY user_id
)
SELECT
  u.username,
  COALESCE(t.total_spent, 0) AS total_spent
FROM users u
LEFT JOIN user_totals t
  ON t.user_id = u.id
ORDER BY total_spent DESC;
`
    },

    // =====================================================
    // 11. WINDOW FUNCTIONS
    // =====================================================
    {
      id: "window-functions",
      title: "Window Functions",
      title_sq: "Window Functions",

      content_sq: `
Window functions llogarisin rezultate mbi një grup rreshtash të lidhur me rreshtin aktual, pa i bashkuar domosdoshmërisht në një rresht të vetëm si GROUP BY.

Elementet:
- OVER(): Përcakton dritaren.
- PARTITION BY: Ndan të dhënat në grupe.
- ORDER BY: Përcakton rendin brenda dritares.
- ROW_NUMBER(): Numër rendor unik brenda dritares.
- RANK() dhe DENSE_RANK(): Renditje me trajtim të ndryshëm të barazimeve.
- LAG() dhe LEAD(): Lexojnë vlera nga rreshta fqinjë.
      `,

      content_en: `
Window functions calculate values across related rows while retaining individual rows. Common functions include ROW_NUMBER, RANK, DENSE_RANK, LAG, and LEAD.
      `,

      example: `
SELECT
  user_id,
  id AS order_id,
  total_amount,
  ROW_NUMBER() OVER (
    PARTITION BY user_id
    ORDER BY total_amount DESC, id
  ) AS order_rank
FROM orders;
`
    },

    // =====================================================
    // 12. CONSTRAINTS
    // =====================================================
    {
      id: "constraints",
      title: "Constraints and Data Integrity",
      title_sq: "Constraints dhe Integriteti i të Dhënave",

      content_sq: `
Constraints zbatojnë rregulla në nivel databaze.

- PRIMARY KEY: Identitet unik dhe jo-NULL.
- FOREIGN KEY: Ruajtje e integritetit referencial.
- UNIQUE: Ndalon kombinime të përsëritura, sipas rregullave të DBMS për NULL.
- NOT NULL: Ndalon vlerat NULL.
- CHECK: Verifikon një kusht.
- DEFAULT: Jep vlerë fillestare kur kolona lihet jashtë INSERT-it.

Rregullat kritike duhet të zbatohen në databazë, jo vetëm në kodin e aplikacionit.
      `,

      content_en: `
Constraints enforce data integrity. Primary keys, foreign keys, unique constraints, NOT NULL, CHECK, and DEFAULT rules protect stored data.
      `,

      example: `
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total_amount NUMERIC(12, 2) NOT NULL
    CHECK (total_amount >= 0),
  status VARCHAR(20) NOT NULL
    DEFAULT 'pending'
);
`
    },

    // =====================================================
    // 13. NORMALIZATION
    // =====================================================
    {
      id: "normalization",
      title: "Database Normalization",
      title_sq: "Normalizimi i Databazës",

      content_sq: `
Normalizimi organizon të dhënat për të reduktuar përsëritjen dhe anomalitë gjatë INSERT, UPDATE dhe DELETE.

- 1NF: Vlera atomike sipas modelit të përdorur.
- 2NF: Heq varësitë e pjesshme nga një pjesë e çelësit kandidat.
- 3NF: Redukton varësitë tranzitive të papërshtatshme.
- BCNF: Kërkon që çdo determinant të jetë superkey sipas përkufizimit formal.

Denormalizimi mund të përdoret me vetëdije për performancë, por kërkon strategji për konsistencën.
      `,

      content_en: `
Normalization reduces redundancy and update anomalies. Common forms include 1NF, 2NF, 3NF, and BCNF. Denormalization can be appropriate when justified by workload requirements.
      `,

      example: `
-- Instead of repeating customer details in every order:
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE customer_orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  order_date DATE NOT NULL
);
`
    },

    // =====================================================
    // 14. INDEXES
    // =====================================================
    {
      id: "indexes",
      title: "Indexes and Index Design",
      title_sq: "Indekset dhe Projektimi i Tyre",

      content_sq: `
Indekset ndihmojnë DBMS të gjejë rreshta pa skanuar domosdoshmërisht të gjithë tabelën.

Lloje dhe koncepte:
- B-tree: I përshtatshëm për shumë kërkime dhe intervale.
- Unique index: Zbaton unikalitet.
- Composite index: Përmban disa kolona.
- Partial ose filtered index: Indekson një nëngrup rreshtash, sipas DBMS.
- Covering index: Mund të përmbajë të dhënat e nevojshme për një pyetje.

Indekset shtojnë kosto për shkrimet, hapësirën dhe mirëmbajtjen. Renditja e kolonave në një indeks të përbërë ka rëndësi.
      `,

      content_en: `
Indexes can accelerate retrieval but increase storage and write overhead. Index choice should reflect filters, joins, sorting, selectivity, and database-specific capabilities.
      `,

      example: `
CREATE INDEX idx_orders_user_date
ON orders (user_id, order_date);

-- PostgreSQL-specific example:
CREATE INDEX idx_active_users_email
ON users (email)
WHERE status = 'active';
`
    },

    // =====================================================
    // 15. QUERY OPTIMIZATION
    // =====================================================
    {
      id: "query-optimization",
      title: "Query Plans and Optimization",
      title_sq: "Planet e Pyetjeve dhe Optimizimi",

      content_sq: `
Optimizimi fillon me matjen e problemit real.

Mjetet:
- EXPLAIN: Shfaq planin e ekzekutimit.
- EXPLAIN ANALYZE: Ekzekuton pyetjen dhe raporton matje reale në sistemet që e mbështesin.
- Statistics: Ndihmojnë optimizer-in të vlerësojë numrin e rreshtave.
- Query profiling: Identifikon pyetjet e ngadalta.

Shmang optimizimet e bazuara vetëm në intuitë. Kontrollo planin, cardinality, indeksimin dhe madhësinë e të dhënave.
      `,

      content_en: `
Query optimization should be evidence-driven. Execution plans, statistics, profiling, indexes, and workload measurements help identify bottlenecks.
      `,

      example: `
-- PostgreSQL example:
EXPLAIN ANALYZE
SELECT id, total_amount
FROM orders
WHERE user_id = 42
ORDER BY order_date DESC
LIMIT 20;
`
    },

    // =====================================================
    // 16. TRANSACTIONS & ACID
    // =====================================================
    {
      id: "transactions-acid",
      title: "Transactions and ACID",
      title_sq: "Transaksionet dhe ACID",

      content_sq: `
Transaksioni grupon operacione që duhet të trajtohen si një njësi logjike.

ACID:
- Atomicity: Të gjitha ose asnjë.
- Consistency: Ruajtja e kufizimeve të vlefshme.
- Isolation: Kontrollon ndërveprimin mes transaksioneve.
- Durability: Ndryshimet e konfirmuara mbeten të qëndrueshme.

Komandat kryesore janë BEGIN, COMMIT dhe ROLLBACK.

DDL dhe veprimet e caktuara mund të kenë sjellje të veçantë sipas DBMS.
      `,

      content_en: `
Transactions group statements into logical units. ACID describes atomicity, consistency, isolation, and durability. Exact behavior depends on the database engine.
      `,

      example: `
BEGIN;

UPDATE accounts
SET balance = balance - 100
WHERE id = 1;

UPDATE accounts
SET balance = balance + 100
WHERE id = 2;

COMMIT;

-- If an error occurs before commit, use ROLLBACK
-- according to the application's transaction handling.
`
    },

    // =====================================================
    // 17. ISOLATION & CONCURRENCY
    // =====================================================
    {
      id: "isolation-concurrency",
      title: "Isolation Levels and Concurrency",
      title_sq: "Nivelet e Izolimit dhe Konkurrenca",

      content_sq: `
Transaksionet që ekzekutohen njëkohësisht mund të ndërveprojnë në mënyra që varen nga DBMS dhe niveli i izolimit.

Nivelet standarde:
- READ UNCOMMITTED.
- READ COMMITTED.
- REPEATABLE READ.
- SERIALIZABLE.

Fenomenet përfshijnë dirty reads, non-repeatable reads, phantom reads dhe anomalitë e serializimit.

Zbatimi praktik dhe fenomenet e lejuara ndryshojnë sipas motorit të databazës. Aplikacionet duhet të trajtojnë deadlocks dhe dështimet e transaksioneve.
      `,

      content_en: `
Isolation levels control concurrency behavior. Applications must understand database-specific semantics and handle deadlocks, serialization failures, and transaction retries.
      `,

      example: `
-- PostgreSQL example:
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT balance
FROM accounts
WHERE id = 1;

COMMIT;
`
    },

    // =====================================================
    // 18. VIEWS
    // =====================================================
    {
      id: "views",
      title: "Views and Materialized Views",
      title_sq: "Views dhe Materialized Views",

      content_sq: `
View është një pyetje e ruajtur që paraqitet si tabelë virtuale.

Materialized view ruan fizikisht rezultatin dhe zakonisht duhet rifreskuar.

Views ndihmojnë në ripërdorimin e logjikës dhe mund të kufizojnë kolonat e ekspozuara, por nuk zëvendësojnë automatikisht autorizimin e duhur.
      `,

      content_en: `
Views provide reusable query interfaces. Materialized views persist query results and may require explicit refresh operations.
      `,

      example: `
CREATE VIEW active_users AS
SELECT id, username
FROM users
WHERE status = 'active';

SELECT *
FROM active_users;
`
    },

    // =====================================================
    // 19. STORED PROCEDURES & FUNCTIONS
    // =====================================================
    {
      id: "stored-programs",
      title: "Stored Procedures, Functions, and Triggers",
      title_sq: "Stored Procedures, Funksionet dhe Triggers",

      content_sq: `
Disa sisteme databazash mbështesin kod të ruajtur brenda databazës.

- Stored procedure: Procedurë e ekzekutueshme me logjikë të databazës.
- Function: Kthen një vlerë ose rezultat, sipas DBMS.
- Trigger: Ekzekutohet si përgjigje ndaj një ngjarjeje të caktuar.

Këto veçori mund të ndihmojnë për rregulla specifike, por mund ta bëjnë logjikën më të vështirë për t'u testuar dhe migruar nëse përdoren pa standard.
      `,

      content_en: `
Stored procedures, functions, and triggers move some logic into the database. Their syntax and transaction semantics vary significantly by database engine.
      `,

      example: `
-- PostgreSQL-specific trigger function example:
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`
    },

    // =====================================================
    // 20. SECURITY & SQL INJECTION
    // =====================================================
    {
      id: "sql-security",
      title: "SQL Security and Injection Prevention",
      title_sq: "Siguria SQL dhe Parandalimi i Injection",

      content_sq: `
SQL injection ndodh kur hyrjet e pakontrolluara ndërtojnë sintaksën e pyetjes.

Mbrojtjet:
- Përdor prepared statements dhe parametrat e lidhur.
- Mos bashko hyrjen e përdoruesit drejtpërdrejt në SQL.
- Përdor parimin e privilegjit minimal.
- Ndaj rolet e aplikacionit dhe administrimit.
- Kufizo ekspozimin e të dhënave.
- Përdor autorizim dhe auditim.
- Validimi i hyrjeve është shtesë, jo zëvendësim për parametrizimin.

Emrat e kolonave dhe drejtimet ASC/DESC zakonisht nuk mund të parametrizohen si vlera; për to përdor allowlists.
      `,

      content_en: `
Prevent SQL injection with parameterized queries, least-privilege database accounts, explicit authorization, and allowlists for dynamic identifiers that cannot be bound as ordinary values.
      `,

      example: `
-- Parameterized query concept:
SELECT id, username
FROM users
WHERE email = ?;

-- Placeholder syntax depends on the driver and database.
-- Never concatenate untrusted input into SQL text.
`
    },

    // =====================================================
    // 21. MIGRATIONS & SEEDING
    // =====================================================
    {
      id: "migrations-seeding",
      title: "Schema Migrations and Seed Data",
      title_sq: "Migrimet e Skemës dhe të Dhënat Fillestare",

      content_sq: `
Migration është ndryshim i versionuar i skemës ose të dhënave.

Praktikat:
- Mbaj migrimet në version control.
- Ekzekutoji në rend të përcaktuar.
- Testoji në mjedis të ngjashëm me production.
- Planifiko rollback ose procedurë rikuperimi.
- Përdor ndryshime të pajtueshme kur aplikacioni dhe skema vendosen veçmas.
- Përdor seed scripts për të dhëna fillestare të kontrolluara.

Jo çdo ndryshim mund të kthehet mbrapsht pa humbje të të dhënave.
      `,

      content_en: `
Schema migrations version database changes. Reliable workflows include ordering, testing, compatibility planning, recovery procedures, and controlled seed data.
      `,

      example: `
-- Example migration:
ALTER TABLE users
ADD COLUMN display_name VARCHAR(100);

-- Backfill, deploy compatible application code,
-- and add stricter constraints in a later migration
-- when the rollout strategy requires it.
`
    },

    // =====================================================
    // 22. BACKUPS & RECOVERY
    // =====================================================
    {
      id: "backup-recovery",
      title: "Backups, Recovery, and Reliability",
      title_sq: "Backup-et, Rikuperimi dhe Besueshmëria",

      content_sq: `
Strategjia e backup-it duhet të përcaktojë:
- Frekuencën e kopjeve.
- Ruajtjen e sigurt dhe kontrollin e qasjes.
- Retention period.
- Objektivat RPO dhe RTO.
- Testet e rikuperimit.
- Mbrojtjen nga fshirja aksidentale dhe ransomware.

Backup-i nuk konsiderohet i besueshëm derisa rikuperimi të testohet.
      `,

      content_en: `
Backup and recovery planning includes retention, access control, recovery objectives, and regularly tested restoration procedures.
      `
    },

    // =====================================================
    // 23. SQL DIALECT DIFFERENCES
    // =====================================================
    {
      id: "sql-dialects",
      title: "SQL Dialects and Portability",
      title_sq: "Dialektet SQL dhe Portabiliteti",

      content_sq: `
SQL ka standarde, por DBMS-të ndryshojnë në sintaksë dhe sjellje.

Dallime të zakonshme:
- Auto-generated IDs.
- Kufizimi i numrit të rreshtave.
- Upsert dhe conflict handling.
- JSON operators.
- Date/time functions.
- Returning rows from INSERT/UPDATE.
- Procedural languages.
- Transactional DDL.

Dokumento përdorimin e veçorive specifike të motorit për të shmangur migrime të papritura.
      `,

      content_en: `
SQL dialects differ in identity generation, pagination, upsert behavior, JSON support, date functions, procedural syntax, and transactional DDL.
      `,

      example: `
-- PostgreSQL-style identity:
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

-- MySQL commonly uses AUTO_INCREMENT.
-- SQL Server commonly uses IDENTITY.
-- SQLite has its own rowid and INTEGER PRIMARY KEY behavior.
`
    },

    // =====================================================
    // 24. PAGINATION
    // =====================================================
    {
      id: "pagination",
      title: "Pagination and Stable Ordering",
      title_sq: "Pagination dhe Renditja e Qëndrueshme",

      content_sq: `
Pagination kufizon të dhënat që kthehen për një faqe.

Offset pagination është e thjeshtë, por mund të bëhet e kushtueshme për offset-e të mëdha dhe mund të ndikohet nga ndryshimet e të dhënave.

Keyset pagination përdor vlerat e rreshtit të fundit për të marrë faqen pasuese.

Renditja duhet të jetë deterministe, zakonisht duke shtuar një çelës unik si kriter dytësor.
      `,

      content_en: `
Offset pagination is simple but can become expensive for large offsets. Keyset pagination can be more efficient for sequential navigation when supported by suitable indexes.
      `,

      example: `
-- Offset pagination:
SELECT id, created_at
FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 40;

-- Keyset pagination:
SELECT id, created_at
FROM orders
WHERE (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
`
    },

    // =====================================================
    // 25. JSON DATA
    // =====================================================
    {
      id: "json-data",
      title: "JSON Data in Relational Databases",
      title_sq: "Të Dhënat JSON në Databazat Relacionale",

      content_sq: `
Disa DBMS mbështesin ruajtjen dhe kërkimin e dokumenteve JSON.

JSON është i dobishëm për atribute fleksibël, por të dhënat që përdoren shpesh për filtrim, marrëdhënie ose integritet mund të jenë më të përshtatshme si kolona të normalizuara.

Operatorët dhe indekset JSON ndryshojnë sipas sistemit.
      `,

      content_en: `
JSON support allows flexible document-like data within relational databases. Frequently queried and integrity-critical attributes may be better represented as ordinary columns.
      `,

      example: `
-- PostgreSQL example:
CREATE TABLE app_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payload JSONB NOT NULL
);

SELECT payload
FROM app_events
WHERE payload ->> 'type' = 'login';
`
    },

    // =====================================================
    // 26. SQL STYLE & MAINTAINABILITY
    // =====================================================
    {
      id: "sql-style",
      title: "SQL Style and Maintainability",
      title_sq: "Stili SQL dhe Mirëmbajtshmëria",

      content_sq: `
SQL i lexueshëm e bën më të lehtë auditimin, debugging dhe optimizimin.

Praktika:
- Përdor alias të qartë.
- Shkruaj emrat e kolonave në vend të SELECT * kur kontrata duhet të jetë e qëndrueshme.
- Formatizo JOIN dhe kushtet në rreshta të veçantë.
- Përdor parametra për vlerat dinamike.
- Dokumento logjikën komplekse.
- Kontrollo planet e ekzekutimit për pyetjet kritike.
      `,

      content_en: `
Readable SQL improves review, debugging, and optimization. Use clear aliases, explicit column lists, parameterized inputs, and consistent formatting.
      `,

      example: `
SELECT
  u.id AS user_id,
  u.username,
  COUNT(o.id) AS order_count
FROM users AS u
LEFT JOIN orders AS o
  ON o.user_id = u.id
GROUP BY
  u.id,
  u.username
ORDER BY
  order_count DESC,
  u.id;
`
    },

    // =====================================================
    // 27. GLOSSARY
    // =====================================================
    {
      id: "sql-glossary",
      title: "SQL Glossary",
      title_sq: "Fjalorthi i SQL",

      terms: [
        {
          term: "RDBMS",
          definition_sq: "Sistem për menaxhimin e bazave relacionale të të dhënave.",
          definition_en: "Relational Database Management System."
        },
        {
          term: "Primary Key",
          definition_sq: "Çelës që identifikon në mënyrë unike rreshtat.",
          definition_en: "A key that uniquely identifies rows."
        },
        {
          term: "Foreign Key",
          definition_sq: "Kufizim që ruan integritetin referencial.",
          definition_en: "A constraint that maintains referential integrity."
        },
        {
          term: "Normalization",
          definition_sq: "Organizimi i të dhënave për të zvogëluar përsëritjen dhe anomalitë.",
          definition_en: "Organizing data to reduce redundancy and anomalies."
        },
        {
          term: "Index",
          definition_sq: "Strukturë që mund të përshpejtojë gjetjen e rreshtave.",
          definition_en: "A structure that can accelerate row retrieval."
        },
        {
          term: "Transaction",
          definition_sq: "Njësi logjike e operacioneve të databazës.",
          definition_en: "A logical unit of database operations."
        },
        {
          term: "CTE",
          definition_sq: "Rezultat i emërtuar brenda një pyetjeje përmes WITH.",
          definition_en: "A named query result defined using WITH."
        },
        {
          term: "Window Function",
          definition_sq: "Funksion që llogarit mbi rreshta të lidhur pa i bashkuar në një rresht të vetëm.",
          definition_en: "A function that calculates across related rows without collapsing them."
        },
        {
          term: "SQL Injection",
          definition_sq: "Dobësi që vjen nga ndërtimi i pasigurt i pyetjeve SQL.",
          definition_en: "A vulnerability caused by unsafe construction of SQL statements."
        },
        {
          term: "Migration",
          definition_sq: "Ndryshim i versionuar i skemës ose të dhënave.",
          definition_en: "A versioned change to a database schema or data."
        }
      ]
    }
  ]
};

// CommonJS compatibility.
// For pure CommonJS projects, prefer module.exports without ES export syntax.
if (typeof module !== "undefined" && module.exports) {
  module.exports = sqlFundamentalsKnowledge;
}
