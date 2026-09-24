import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { setSessionTokenGetter } from "../src/api/auth";

beforeEach(() => {
  setSessionTokenGetter(async () => "test-session");
});

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
  setSessionTokenGetter(null);
  cleanup();
});
