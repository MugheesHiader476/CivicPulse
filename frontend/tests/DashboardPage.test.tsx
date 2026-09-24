import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DashboardPage } from "../src/pages/DashboardPage";
import { jsonResponse, makeComplaint, mockFetch, renderPage } from "./utils";

function page(items = [makeComplaint()], total = items.length, pageNo = 1, pageSize = 20) {
  return jsonResponse({ items, total, page: pageNo, page_size: pageSize });
}

describe("DashboardPage", () => {
  it("sends filters and pagination to the API and resets to page 1 when a filter changes", async () => {
    const { calls } = mockFetch(() => page([makeComplaint()], 45));
    const user = userEvent.setup();
    renderPage(<DashboardPage />, { route: "/dashboard?page=2", path: "/dashboard" });

    await screen.findByText(/showing/i);
    expect(calls.at(-1)?.url.searchParams.get("page")).toBe("2");
    expect(calls.at(-1)?.url.searchParams.get("page_size")).toBe("20");

    await user.click(screen.getByRole("radio", { name: /water/i }));
    await waitFor(() => expect(calls.at(-1)?.url.searchParams.get("category")).toBe("water"));
    expect(calls.at(-1)?.url.searchParams.get("page")).toBe("1");

    await user.click(screen.getByRole("button", { name: "Page 3" }));
    await waitFor(() => expect(calls.at(-1)?.url.searchParams.get("page")).toBe("3"));
    expect(calls.at(-1)?.url.searchParams.get("category")).toBe("water");
  });

  it("surfaces the server's 409 message verbatim on an invalid transition", async () => {
    const message = "Invalid status transition: resolved -> open. Allowed from resolved: none (terminal state).";
    mockFetch((call) =>
      call.method === "PATCH"
        ? jsonResponse({ detail: message }, { status: 409 })
        : page([makeComplaint({ status: "resolved" })]),
    );
    const user = userEvent.setup();
    renderPage(<DashboardPage />, { route: "/dashboard", path: "/dashboard" });

    await user.click(await screen.findByRole("button", { name: /manage/i }));
    const options = screen.getByRole("group", { name: /move to/i });
    await user.click(within(options).getByRole("button", { name: /^open$/i }));

    expect(await screen.findByTestId("conflict-message")).toHaveTextContent(message, { normalizeWhitespace: false });
    expect(screen.getByRole("alert")).toHaveTextContent("HTTP 409");
  });

  it("offers every other status and leaves the decision to the server", async () => {
    const { calls } = mockFetch((call) =>
      call.method === "PATCH"
        ? jsonResponse(makeComplaint({ status: "in_progress" }))
        : page([makeComplaint({ status: "open" })]),
    );
    const user = userEvent.setup();
    renderPage(<DashboardPage />, { route: "/dashboard", path: "/dashboard" });

    await user.click(await screen.findByRole("button", { name: /manage/i }));
    const options = within(screen.getByRole("group", { name: /move to/i })).getAllByRole("button");
    expect(options.map((o) => o.textContent)).toEqual(["In progress", "Resolved", "Rejected"]);

    await user.click(options[0]!);
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch?.url.pathname).toBe(`/api/complaints/${makeComplaint().id}/status`);
    expect(patch?.body).toEqual({ status: "in_progress" });
    expect(await screen.findByText(/status changed: open → in progress/i)).toBeInTheDocument();
  });

  it("shows the server's message when the list cannot load", async () => {
    mockFetch(() => new Response("<html>502 Bad Gateway</html>", { status: 502 }));
    renderPage(<DashboardPage />, { route: "/dashboard", path: "/dashboard" });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load complaints");
    expect(alert).toHaveTextContent("HTTP 502");
  });
});
