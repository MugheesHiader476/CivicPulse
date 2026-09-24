import { components } from "../../openapi/openapi.json";

/**
 * Field constraints read straight from the backend's OpenAPI document, so client-side validation
 * mirrors the server's rules instead of restating them. The server still validates everything;
 * this only saves the citizen a round trip.
 */

export interface LengthRule {
  min?: number;
  max?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads minLength/maxLength from a property, including FastAPI's `anyOf: [{...}, {type: null}]` form. */
export function lengthRuleOf(node: unknown): LengthRule {
  if (!isRecord(node)) return {};
  const rule: LengthRule = {};
  const candidates = [node, ...(Array.isArray(node.anyOf) ? node.anyOf : []), ...(Array.isArray(node.oneOf) ? node.oneOf : [])];
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    if (typeof candidate.minLength === "number") rule.min ??= candidate.minLength;
    if (typeof candidate.maxLength === "number") rule.max ??= candidate.maxLength;
  }
  return rule;
}

const createSchema: unknown = (components.schemas as Record<string, unknown>).ComplaintCreate;
const properties = isRecord(createSchema) && isRecord(createSchema.properties) ? createSchema.properties : {};
const required = isRecord(createSchema) && Array.isArray(createSchema.required) ? createSchema.required : [];

export type ComplaintField = "text" | "location" | "reporter_contact";

export const complaintRules: Readonly<Record<ComplaintField, LengthRule & { required: boolean }>> = {
  text: { ...lengthRuleOf(properties.text), required: required.includes("text") },
  location: { ...lengthRuleOf(properties.location), required: required.includes("location") },
  reporter_contact: { ...lengthRuleOf(properties.reporter_contact), required: required.includes("reporter_contact") },
};
