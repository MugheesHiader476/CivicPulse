import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MyReportsPage } from "../src/pages/MyReportsPage";
import { jsonResponse, makeComplaint, mockFetch, renderPage } from "./utils";

describe("MyReportsPage", () => {
  it("loads the authenticated account's report list from the personal endpoint", async () => {
    const { calls } = mockFetch((call) => {
      expect(call.url.pathname).toBe("/api/my/complaints");
      return jsonResponse({ items: [makeComplaint({ location: "My street" })], total: 1, page: 1, page_size: 20 });
    });
    renderPage(<MyReportsPage />, { route: "/my-reports", path: "/my-reports" });
    expect(await screen.findByRole("heading", { name: /my reports/i })).toBeInTheDocument();
    expect(await screen.findByText("My street")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /burst water main flooding street 12 since dawn/i })).toHaveAttribute(
      "href", `/my-reports/${makeComplaint().id}`,
    );
    await waitFor(() => expect(calls).toHaveLength(1));
  });

  it("lets the account browse beyond its first 20 reports", async () => {
    const { calls } = mockFetch((call) => jsonResponse({
      items: [makeComplaint({ id: call.url.searchParams.get("page") === "2" ? "second-page" : "first-page" })],
      total: 21, page: Number(call.url.searchParams.get("page")), page_size: 20,
    }));
    renderPage(<MyReportsPage />, { route: "/my-reports", path: "/my-reports" });
    const user = userEvent.setup();
    await screen.findByRole("link", { name: /burst water main flooding street 12 since dawn/i });
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    await waitFor(() => expect(calls.at(-1)?.url.searchParams.get("page")).toBe("2"));
    expect(await screen.findByRole("link", { name: /burst water main flooding street 12 since dawn/i })).toHaveAttribute(
      "href", "/my-reports/second-page",
    );
  });
});
