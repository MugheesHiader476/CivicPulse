import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SubmitPage } from "../src/pages/SubmitPage";
import { jsonResponse, makeComplaint, mockFetch, renderPage } from "./utils";

const VALID_TEXT = "Burst water main flooding Street 12 since fajr, water entering ground floors.";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/describe the problem/i), VALID_TEXT);
  await user.type(screen.getByLabelText(/where is it/i), "Street 12, Samanabad");
}

describe("SubmitPage", () => {
  it("blocks submission and explains client-side validation errors without calling the server", async () => {
    const { fn } = mockFetch(() => jsonResponse({}));
    const user = userEvent.setup();
    renderPage(<SubmitPage />);

    await user.type(screen.getByLabelText(/describe the problem/i), "too short");
    await user.click(screen.getByRole("button", { name: /send for triage/i }));

    expect(screen.getByLabelText(/describe the problem/i)).toHaveAccessibleDescription(
      expect.stringContaining("needs at least 10 characters"),
    );
    expect(screen.getByLabelText(/where is it/i)).toHaveAccessibleDescription(
      expect.stringContaining("Location is required"),
    );
    expect(screen.getByLabelText(/describe the problem/i)).toHaveFocus();
    expect(fn).not.toHaveBeenCalled();
  });

  it("sends trimmed values and renders category, priority, AI summary and provider from the server", async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(makeComplaint({ triaged_by: "llm:groq", triage_latency_ms: 812 }), { status: 201 }),
    );
    const user = userEvent.setup();
    renderPage(<SubmitPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send for triage/i }));

    const result = await screen.findByRole("region", { name: /thank you/i });
    expect(within(result).getByText("Water")).toBeInTheDocument();
    expect(result.querySelector(".badge-priority")).toHaveTextContent("High priority");
    expect(within(result).getByText("Burst water main flooding Street 12 since dawn.")).toBeInTheDocument();
    expect(within(result).getByText("llm:groq")).toBeInTheDocument();
    expect(within(result).getByText(/812 ms/)).toBeInTheDocument();
    expect(within(result).getByRole("link", { name: /track your report/i })).toHaveAttribute(
      "href", `/my-reports/${makeComplaint().id}`,
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url.pathname).toBe("/api/complaints");
    expect(calls[0]?.body).toEqual({ text: VALID_TEXT, location: "Street 12, Samanabad", reporter_contact: null });
    expect(calls[0]?.headers.get("X-Request-ID")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("explains a rules fallback so the citizen knows nothing was lost", async () => {
    mockFetch(() => jsonResponse(makeComplaint({ triaged_by: "rules:fallback" }), { status: 201 }));
    const user = userEvent.setup();
    renderPage(<SubmitPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send for triage/i }));

    expect(await screen.findByText("rules:fallback")).toBeInTheDocument();
    expect(screen.getByText(/AI provider was unavailable/i)).toBeInTheDocument();
  });

  it("shows an honest loading state while the server triages", async () => {
    let respond: (r: Response) => void = () => {};
    mockFetch(() => new Promise<Response>((resolve) => (respond = resolve)));
    const user = userEvent.setup();
    renderPage(<SubmitPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send for triage/i }));

    expect(await screen.findByText(/reading your complaint/i)).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("button", { name: /send for triage/i })).not.toBeInTheDocument();

    respond(jsonResponse(makeComplaint(), { status: 201 }));
    expect(await screen.findByRole("region", { name: /thank you/i })).toBeInTheDocument();
  });

  it("maps the server's field-level 400 errors onto the matching fields", async () => {
    mockFetch(() =>
      jsonResponse(
        { detail: "Validation failed", errors: [{ field: "location", message: "Location is outside the service area." }] },
        { status: 400 },
      ),
    );
    const user = userEvent.setup();
    renderPage(<SubmitPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send for triage/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/where is it/i)).toHaveAccessibleDescription(
        expect.stringContaining("Location is outside the service area."),
      ),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Validation failed");
  });

  it("locks the form with the Retry-After countdown on 429", async () => {
    mockFetch(() =>
      jsonResponse({ detail: "Rate limit exceeded: 6 complaints per minute." }, { status: 429, headers: { "Retry-After": "42" } }),
    );
    const user = userEvent.setup();
    renderPage(<SubmitPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send for triage/i }));

    const button = await screen.findByRole("button", { name: /try again in 42 s/i });
    expect(button).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Rate limit exceeded: 6 complaints per minute.");
  });
});
