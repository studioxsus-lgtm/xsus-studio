export const FORM_VALIDATOR_VERSION="0.1.0";
const TYPES=new Set(["string","number","boolean","email"]);
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function createFormValidator(schema) {
  if(!schema || typeof schema!=="object" || Array.isArray(schema)) throw new TypeError("Form schema must be an object");
  const fields=Object.entries(schema);
  if(fields.length>100) throw new RangeError("Too many form fields");
  for(const [name,rule] of fields) {
    if(!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(name) || ["constructor","prototype","__proto__"].includes(name)) throw new TypeError("Unsafe form field name");
    if(!rule || typeof rule!=="object" || !TYPES.has(rule.type) || (rule.required!==undefined && typeof rule.required!=="boolean")) throw new TypeError("Invalid form rule");
    if(rule.maxLength!==undefined && (!Number.isSafeInteger(rule.maxLength)||rule.maxLength<0||rule.maxLength>100000)) throw new TypeError("Invalid maxLength");
  }
  return Object.freeze({
    validate(values) {
      if(!values || typeof values!=="object" || Array.isArray(values)) throw new TypeError("Form values must be an object");
      const errors=Object.create(null);
      const data=Object.create(null);
      for(const [name,rule] of fields) {
        const value=Object.hasOwn(values,name)?values[name]:undefined;
        if(value===undefined || value===null || value==="") {
          if(rule.required) errors[name]="required";
          continue;
        }
        const valid=rule.type==="string"?typeof value==="string":
          rule.type==="number"?typeof value==="number"&&Number.isFinite(value):
          rule.type==="boolean"?typeof value==="boolean":
          typeof value==="string"&&value.length<=254&&EMAIL.test(value);
        if(!valid) {errors[name]="invalid_type";continue;}
        if(typeof value==="string"&&rule.maxLength!==undefined&&value.length>rule.maxLength) {errors[name]="too_long";continue;}
        data[name]=value;
      }
      return Object.freeze({valid:Object.keys(errors).length===0,errors:Object.freeze(errors),data:Object.freeze(data)});
    }
  });
}
