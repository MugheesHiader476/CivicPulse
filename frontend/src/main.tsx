import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/jetbrains-mono";
import "./styles/app.css";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";

function render() {
  const container = document.getElementById("root");
  if (!container) throw new Error("#root element missing from index.html");
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

// `npm run dev:mock` swaps the network for an in-browser fake backend so the UI can be explored without
// the API. The condition is false in every production build, so the mock is never bundled.
if (import.meta.env.DEV && import.meta.env.MODE === "mock") {
  void import("./mocks/install").then(({ installMockApi }) => {
    installMockApi();
    render();
  });
} else {
  render();
}
