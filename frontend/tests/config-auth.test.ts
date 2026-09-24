import { expect, it } from "vitest";
import { readRuntimeConfig } from "../src/config";

it("accepts a Clerk publishable key but never a secret or executable config value", () => {
  expect(readRuntimeConfig({ clerkPublishableKey: "pk_test_example=" }).clerkPublishableKey)
    .toBe("pk_test_example=");
  expect(readRuntimeConfig({ clerkPublishableKey: "sk_test_secret" }).clerkPublishableKey).toBe("");
  expect(readRuntimeConfig({ clerkPublishableKey: 'pk_test_x";alert(1)//' }).clerkPublishableKey).toBe("");
});
