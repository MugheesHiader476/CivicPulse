import { useState } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { createQueryClient } from "./lib/queries";
import { ComplaintPage } from "./pages/ComplaintPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { StatsPage } from "./pages/StatsPage";
import { SubmitPage } from "./pages/SubmitPage";

/** Resets the boundary on navigation, so one crashed view does not trap the user. */
function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Routes>
        <Route path="/" element={<SubmitPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/complaints/:id" element={<ComplaintPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppShell>
            <AppRoutes />
          </AppShell>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
