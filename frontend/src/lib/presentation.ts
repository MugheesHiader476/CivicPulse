import {
  Bot,
  Construction,
  Cpu,
  Droplets,
  FlaskConical,
  LifeBuoy,
  Lightbulb,
  ListChecks,
  Shapes,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Category, Priority, Status } from "../api/client";

/**
 * Presentation only: labels, icons and colour hooks for values the backend decides.
 * Keyed by the generated union types, so a new enum value in the schema is a compile error here
 * until it gets a label. No business rule (valid transitions, triage logic) lives in the frontend.
 */

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon }> = {
  water: { label: "Water", icon: Droplets },
  electricity: { label: "Electricity", icon: Zap },
  sanitation: { label: "Sanitation", icon: Trash2 },
  roads: { label: "Roads", icon: Construction },
  streetlights: { label: "Streetlights", icon: Lightbulb },
  other: { label: "Other", icon: Shapes },
};

export const PRIORITY_META: Record<Priority, { label: string }> = {
  high: { label: "High" },
  normal: { label: "Normal" },
  low: { label: "Low" },
};

export const STATUS_META: Record<Status, { label: string }> = {
  open: { label: "Open" },
  in_progress: { label: "In progress" },
  resolved: { label: "Resolved" },
  rejected: { label: "Rejected" },
};

export type ProviderTone = "ai" | "local" | "rules" | "fallback" | "simulated" | "unknown";

export interface ProviderInfo {
  label: string;
  tone: ProviderTone;
  explanation: string;
  icon: LucideIcon;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Describes a `triaged_by` value such as "llm:groq" or "rules:fallback" in plain language. */
export function describeProvider(triagedBy: string): ProviderInfo {
  const value = triagedBy.trim().toLowerCase();
  if (value === "rules:fallback") {
    return {
      label: "Rules (fallback)",
      tone: "fallback",
      explanation: "The AI provider was unavailable, so the keyword rules triaged this complaint. Nothing was lost.",
      icon: LifeBuoy,
    };
  }
  if (value === "rules") {
    return {
      label: "Keyword rules",
      tone: "rules",
      explanation: "Triaged by the deterministic keyword rules.",
      icon: ListChecks,
    };
  }
  if (value === "llm:ollama") {
    return {
      label: "Ollama (local model)",
      tone: "local",
      explanation: "Triaged by a language model running inside the CivicPulse stack. No data left the network.",
      icon: Cpu,
    };
  }
  if (value.startsWith("llm:")) {
    const name = titleCase(value.slice(4) || "hosted");
    return {
      label: `${name} LLM`,
      tone: "ai",
      explanation: `Triaged by a hosted language model (${name}).`,
      icon: Bot,
    };
  }
  if (value.startsWith("simulated")) {
    return {
      label: "Simulated",
      tone: "simulated",
      explanation: "Triaged by the deterministic test provider.",
      icon: FlaskConical,
    };
  }
  return { label: triagedBy || "Unknown", tone: "unknown", explanation: "Triage provider not recognised.", icon: Shapes };
}
