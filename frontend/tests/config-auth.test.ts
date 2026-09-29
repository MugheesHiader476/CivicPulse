import { expect, it } from "vitest";
import { readRuntimeConfig } from "../src/config";

it("accepts a Clerk publishable key but never a secret or executable config value", () => {
  expect(readRuntimeConfig({ clerkPublishableKey: "pk_test_example=" }).clerkPublishableKey)
    .toBe("pk_test_example=");
  expect(readRuntimeConfig({ clerkPublishableKey: "sk_test_secret" }).clerkPublishableKey).toBe("");
  expect(readRuntimeConfig({ clerkPublishableKey: 'pk_test_x";alert(1)//' }).clerkPublishableKey).toBe("");
});

it("enables demo auth only for the exact demo runtime value", () => {
  expect(readRuntimeConfig({ authMode: "demo" }).authMode).toBe("demo");
  expect(readRuntimeConfig({ authMode: "clerk" }).authMode).toBe("clerk");
  expect(readRuntimeConfig({ authMode: "anything-else" }).authMode).toBe("clerk");
});
