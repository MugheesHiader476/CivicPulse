import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error("kaboom in the view");
  return <p>all good</p>;
}

function Harness() {
  const [explode, setExplode] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setExplode(false)}>
        defuse
      </button>
      <ErrorBoundary>
        <Bomb explode={explode} />
      </ErrorBoundary>
    </>
  );
}

describe("ErrorBoundary", () => {
  it("replaces a crashed view with a recoverable fallback", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole("alert")).toHaveTextContent("This screen hit a snag");
    expect(screen.getByText("kaboom in the view")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "defuse" }));
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("clears the error when the reset key changes (navigation)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary resetKey="/stats">
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/dashboard">
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });
});
