import { useAuth } from "@clerk/react";
import { useLayoutEffect, useState } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { setSessionTokenGetter, type SessionTokenGetter } from "./api/auth";
import { getCurrentUser } from "./api/client";
import { AppShell } from "./components/AppShell";
import { ErrorNotice } from "./components/ErrorNotice";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";
import { createQueryClient } from "./lib/queries";
import { AuthLoading, AuthPage } from "./pages/AuthPage";
import { ComplaintPage } from "./pages/ComplaintPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { StatsPage } from "./pages/StatsPage";
import { SubmitPage } from "./pages/SubmitPage";

const mockToken: SessionTokenGetter = async () => "mock-session";

/** Resets the boundary on navigation, so one crashed view does not trap the user. */
function AppRoutes({ isOperator }: { isOperator: boolean }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Routes>
        <Route path="/" element={<SubmitPage />} />
        <Route path="/dashboard" element={isOperator ? <DashboardPage /> : <AccessDeniedPage />} />
        <Route path="/complaints/:id" element={isOperator ? <ComplaintPage /> : <AccessDeniedPage />} />
        <Route path="/stats" element={<StatsPage isOperator={isOperator} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

function WorkspaceContent({ mockAuth }: { mockAuth: boolean }) {
  const user = useQuery({
    queryKey: ["current-user"],
    queryFn: ({ signal }) => getCurrentUser(signal),
    staleTime: Infinity,
    enabled: !mockAuth,
  });
  if (!mockAuth && user.isPending) return <AuthLoading />;
  if (!mockAuth && user.isError) {
    return <main className="container main"><ErrorNotice error={user.error} title="Could not check account access" onRetry={() => void user.refetch()} /></main>;
  }
  const isOperator = mockAuth || user.data?.role === "operator";
  return <AppShell isOperator={isOperator}><AppRoutes isOperator={isOperator} /></AppShell>;
}

function Workspace({ getToken, mockAuth = false }: { getToken: SessionTokenGetter; mockAuth?: boolean }) {
  const [queryClient] = useState(createQueryClient);

  // Install the session source before any child query can run. A new Workspace is mounted for
  // each Clerk session, so cached complaint/contact data cannot survive a user switch.
  useLayoutEffect(() => {
    setSessionTokenGetter(getToken);
    return () => {
      setSessionTokenGetter(null);
      queryClient.clear();
    };
  }, [getToken, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <WorkspaceContent mockAuth={mockAuth} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

function ClerkRoutes() {
  const { isLoaded, isSignedIn, getToken, sessionId } = useAuth();
  const location = useLocation();
  if (!isLoaded) return <AuthLoading />;

  if (!isSignedIn) {
    const intendedPath = `${location.pathname}${location.search}`;
    const redirectUrl = `${window.location.origin}${intendedPath}`;
    return (
      <Routes>
        <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
        <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
        <Route path="*" element={<Navigate to={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`} replace />} />
      </Routes>
    );
  }

  if (location.pathname.startsWith("/sign-in") || location.pathname.startsWith("/sign-up")) {
    return <Navigate to="/" replace />;
  }
  return <Workspace key={sessionId ?? "signed-in"} getToken={getToken} />;
}

/** BrowserRouter is provided at the entry point so Clerk can share its navigation history. */
export function App({ mockAuth = false }: { mockAuth?: boolean }) {
  return mockAuth ? <Workspace getToken={mockToken} mockAuth /> : <ClerkRoutes />;
}
