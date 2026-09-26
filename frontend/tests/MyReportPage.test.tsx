import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MyReportPage } from "../src/pages/MyReportPage";
import { jsonResponse, makeComplaint, mockFetch, renderPage } from "./utils";

describe("MyReportPage", () => {
  it("loads status through the account-owned endpoint", async () => {
    const complaint = makeComplaint({ status: "in_progress" });
    const { calls } = mockFetch(() => jsonResponse(complaint));
    renderPage(<MyReportPage />, { route: `/my-reports/${complaint.id}`, path: "/my-reports/:id" });
    expect(await screen.findByRole("heading", { name: complaint.ai_summary ?? "Your report" })).toBeInTheDocument();
    expect(screen.getAllByText(/in progress/i).length).toBeGreaterThan(0);
    expect(calls.map((call) => call.url.pathname)).toEqual([`/api/my/complaints/${complaint.id}`]);
  });

  it("does not expose another account's report when the server returns 404", async () => {
    mockFetch(() => jsonResponse({ detail: "Complaint not found" }, { status: 404 }));
    renderPage(<MyReportPage />, { route: "/my-reports/other-id", path: "/my-reports/:id" });
    expect(await screen.findByRole("heading", { name: "Report not found" })).toBeInTheDocument();
  });
});
