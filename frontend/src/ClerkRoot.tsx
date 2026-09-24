import { ClerkProvider } from "@clerk/react";
import { useNavigate } from "react-router";
import { App } from "./App";
import { runtimeConfig } from "./config";
import { AuthSetupRequired } from "./pages/AuthPage";

export function ClerkRoot() {
  const navigate = useNavigate();
  if (!runtimeConfig.clerkPublishableKey) return <AuthSetupRequired />;
  return (
    <ClerkProvider
      publishableKey={runtimeConfig.clerkPublishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={{
        variables: {
          colorPrimary: "var(--brand)",
          colorBackground: "var(--surface)",
          borderRadius: "12px",
          fontFamily: "var(--font-sans)",
        },
      }}
    >
      <App />
    </ClerkProvider>
  );
}
