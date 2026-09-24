import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/jetbrains-mono";
import "./styles/app.css";
import "./styles/auth.css";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ClerkRoot } from "./ClerkRoot";

const mockAuth = import.meta.env.DEV && import.meta.env.MODE === "mock";

function render() {
  const container = document.getElementById("root");
  if (!container) throw new Error("#root element missing from index.html");
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          {mockAuth ? <App mockAuth /> : <ClerkRoot />}
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  );
}

// The mock backend is available only in development. It never ships in a production bundle.
if (mockAuth) {
  void import("./mocks/install").then(({ installMockApi }) => {
    installMockApi();
    render();
  });
} else {
  render();
}
