import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ProvidersMeta } from "../src/api/client";
import { ProviderSelector } from "../src/components/ProviderSelector";
import { useProviders } from "../src/lib/queries";
import { jsonResponse, mockFetch, renderPage } from "./utils";

const BASE: ProvidersMeta = {
  active_provider: "rules",
  selected_provider: "rules",
  recent: [],
  options: [
    { id: "groq", label: "Groq cloud", model: "llama-3.1-8b-instant", location: "hosted", available: true, reason: null },
    { id: "ollama", label: "Local Ollama", model: "llama3.2:1b-instruct-q4_K_M", location: "local", available: false,
      reason: "Start the local-ai profile and pull the model." },
  ],
};

function Page() {
  const providers = useProviders(false);
  return providers.data ? <ProviderSelector meta={providers.data} /> : null;
}

describe("ProviderSelector", () => {
  it("switches only to an available provider and updates the active state", async () => {
    const { calls } = mockFetch((call) => {
      if (call.method === "PUT") {
        return jsonResponse({ ...BASE, selected_provider: "groq", active_provider: "llm:groq" });
      }
      return jsonResponse(BASE);
    });
    const user = userEvent.setup();
    renderPage(<Page />);

    const groq = await screen.findByRole("button", { name: "Use Groq cloud" });
    expect(screen.getByRole("button", { name: "Use Local Ollama" })).toBeDisabled();
    expect(screen.getByText(/start the local-ai profile/i)).toBeInTheDocument();
    await user.click(groq);
    await waitFor(() => expect(screen.getByRole("button", { name: "Active" })).toBeDisabled());
    const switchCall = calls.find((call) => call.method === "PUT");
    expect(switchCall?.url.pathname).toBe("/api/meta/providers");
    expect(switchCall?.body).toEqual({ provider: "groq" });
  });

  it("shows a server refusal instead of claiming a provider switch succeeded", async () => {
    mockFetch((call) => call.method === "PUT"
      ? jsonResponse({ detail: "Groq is unavailable" }, { status: 409 })
      : jsonResponse(BASE));
    const user = userEvent.setup();
    renderPage(<Page />);

    await user.click(await screen.findByRole("button", { name: "Use Groq cloud" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Groq is unavailable");
    expect(screen.getByRole("button", { name: "Use Groq cloud" })).toBeEnabled();
  });
});
