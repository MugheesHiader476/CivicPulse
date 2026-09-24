import type { ComplaintCreate } from "../api/client";
import { complaintRules, type ComplaintField } from "../api/rules";

export interface ComplaintDraft {
  text: string;
  location: string;
  reporter_contact: string;
}

export type FieldErrors = Partial<Record<ComplaintField, string>>;

const LABELS: Record<ComplaintField, string> = {
  text: "Description",
  location: "Location",
  reporter_contact: "Contact",
};

function checkLength(field: ComplaintField, value: string): string | undefined {
  const rule = complaintRules[field];
  const length = value.length;
  if (length === 0) return rule.required ? `${LABELS[field]} is required.` : undefined;
  if (rule.min !== undefined && length < rule.min) {
    return `${LABELS[field]} needs at least ${rule.min} characters (currently ${length}).`;
  }
  if (rule.max !== undefined && length > rule.max) {
    return `${LABELS[field]} can be at most ${rule.max} characters (currently ${length}).`;
  }
  return undefined;
}

/** Mirrors the server's rules (read from its OpenAPI schema). Values are trimmed exactly as sent. */
export function validateDraft(draft: ComplaintDraft): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of ["text", "location", "reporter_contact"] as const) {
    const message = checkLength(field, draft[field].trim());
    if (message) errors[field] = message;
  }
  return errors;
}

export function toPayload(draft: ComplaintDraft): ComplaintCreate {
  const contact = draft.reporter_contact.trim();
  return {
    text: draft.text.trim(),
    location: draft.location.trim(),
    reporter_contact: contact === "" ? null : contact,
  };
}

export function isComplaintField(field: string): field is ComplaintField {
  return field === "text" || field === "location" || field === "reporter_contact";
}
