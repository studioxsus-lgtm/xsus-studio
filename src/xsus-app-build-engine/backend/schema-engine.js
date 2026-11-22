export const SCHEMA_ENGINE_VERSION="0.1.0";
const IDENT=/^[a-z][a-z0-9_]{0,62}$/;
const TYPES=Object.freeze({text:"text",integer:"integer",boolean:"boolean",timestamp:"timestamptz",uuid:"uuid"});
const RESERVED=new Set(["user","order","select","table","where","group","primary","references","index"]);
function identifier(value) {
  if(typeof value!=="string" || !IDENT.test(value) || RESERVED.has(value)) throw new TypeError("Unsafe database identifier");
  return value;
}
export function createDatabaseSchema({tables}={}) {
  if(!Array.isArray(tables) || tables.length===0 || tables.length>30) throw new TypeError("Expected 1-30 tables");
  const names=new Set();
  const normalized=tables.map(table=>{
    if(!table || typeof table!=="object") throw new TypeError("Invalid table");
    const name=identifier(table.name);
    if(names.has(name)) throw new TypeError("Duplicate table name");
    names.add(name);
    if(!Array.isArray(table.columns) || table.columns.length===0 || table.columns.length>50) throw new TypeError("Invalid columns");
    const columns=new Set(["id","owner_id"]);
    const normalizedColumns=table.columns.map(column=>{
      if(!column || typeof column!=="object") throw new TypeError("Invalid column");
      const key=identifier(column.name);
      if(columns.has(key)) throw new TypeError("Duplicate or reserved column name");
      columns.add(key);
      if(!Object.hasOwn(TYPES,column.type)) throw new TypeError("Unsupported database column type");
      if(column.required!==undefined && typeof column.required!=="boolean") throw new TypeError("Invalid required flag");
      return Object.freeze({name:key,type:column.type,required:column.required===true});
    });
    return Object.freeze({name,columns:Object.freeze(normalizedColumns)});
  });
  const statements=[];
  for(const table of normalized) {
    const cols=table.columns.map(col=>`  "${col.name}" ${TYPES[col.type]}${col.required?" NOT NULL":""}`);
    statements.push(`CREATE TABLE IF NOT EXISTS public."${table.name}" (\n  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  "owner_id" uuid NOT NULL REFERENCES auth.users(id),\n${cols.join(",\n")}\n);`);
    statements.push(`ALTER TABLE public."${table.name}" ENABLE ROW LEVEL SECURITY;`);
    statements.push(`ALTER TABLE public."${table.name}" FORCE ROW LEVEL SECURITY;`);
    for(const operation of ["SELECT","INSERT","UPDATE","DELETE"]) {
      const name=`xsus_${table.name}_${operation.toLowerCase()}_owner`;
      const using=operation==="INSERT"?"":` USING ((select auth.uid()) = owner_id)`;
      const check=["INSERT","UPDATE"].includes(operation)?` WITH CHECK ((select auth.uid()) = owner_id)`:"";
      statements.push(`CREATE POLICY "${name}" ON public."${table.name}" FOR ${operation} TO authenticated${using}${check};`);
    }
  }
  return Object.freeze({version:SCHEMA_ENGINE_VERSION,tables:Object.freeze(normalized),sql:statements.join("\n\n"),requiresReview:true});
}
