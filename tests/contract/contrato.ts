import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";

// O contrato é o YAML. O teste só aplica o schema dele a um JSON.
const contrato = parse(readFileSync("docs/openapi.yaml", "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(contrato, "contrato");

/** Valida `corpo` contra `components.schemas[schema]`. Lista vazia = cumpre o contrato. */
export function validar(schema: string, corpo: unknown): string[] {
  const valida = ajv.getSchema(`contrato#/components/schemas/${schema}`)!;
  valida(corpo);
  return (valida.errors ?? []).map(
    (e) => `${e.instancePath || "(raiz)"} ${e.message}`,
  );
}
