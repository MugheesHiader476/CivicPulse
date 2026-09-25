import { useEffect, useState, type ReactNode } from "react";
import { UserButton } from "@clerk/react";
import { NavLink, useLocation } from "react-router";
import { ChartColumn, LayoutDashboard, Megaphone, Monitor, Moon, Sun } from "lucide-react";
import { runtimeConfig } from "../config";
import { ApiError } from "../api/http";
import { useProviders } from "../lib/queries";
import { applyThemePreference, nextThemePreference, readThemePreference, type ThemePreference } from "../lib/theme";
import { PulseLogo } from "./Pulse";

const NAV = [
  { to: "/", label: "Report", icon: Megaphone, end: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: false },
  { to: "/stats", label: "Stats", icon: ChartColumn, end: false },
] as const;

function isDashboardPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/complaints/");
}

function ProviderChip() {
  const { data, isError, isPending, error } = useProviders();
  const accessNeeded = error instanceof ApiError && (error.status === 401 || error.status === 403);
  const state = isError ? "down" : isPending ? "pending" : "up";
  const label = accessNeeded ? "Operator access needed" : isError ? "API unreachable" : isPending ? "Connecting…" : data?.active_provider;
  return (
    <span className="provider-chip" data-state={state} title="Active triage provider, from /api/meta/providers">
      <span className="live-dot" aria-hidden="true" />
      <span className="provider-chip-label">
        <span className="visually-hidden">Triage provider: </span>
        {label}
      </span>
    </span>
  );
}

function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);
  const next = nextThemePreference(preference);
  const Icon = preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      className="icon-btn icon-btn-framed"
      onClick={() => {
        applyThemePreference(next);
        setPreference(next);
      }}
      aria-label={`Theme: ${preference}. Switch to ${next}.`}
      title={`Theme: ${preference}`}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}

export function AppShell({ children, isOperator }: { children: ReactNode; isOperator: boolean }) {
  const { pathname } = useLocation();
  const environment = runtimeConfig.environment;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const navLinks = (className: string) =>
    NAV.filter(({ to }) => isOperator || to !== "/dashboard").map(({ to, label, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) =>
          `${className}${isActive || (to === "/dashboard" && isDashboardPath(pathname)) ? " is-active" : ""}`
        }
      >
        <Icon size={20} strokeWidth={2.4} aria-hidden="true" />
        <span>{label}</span>
      </NavLink>
    ));

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="container header-row">
          <NavLink to="/" className="brand" aria-label="CivicPulse home">
            <PulseLogo />
            <span className="brand-word">
              Civic<span>Pulse</span>
            </span>
          </NavLink>
          <nav className="top-nav" aria-label="Main">
            {navLinks("top-link")}
          </nav>
          <div className="header-tools">
            {environment !== "mock-api" && <div className="user-control"><UserButton showName /></div>}
            {isOperator && <ProviderChip />}
            <span className="env-badge" data-env={environment} title="Runtime environment, from /config.js">
              {environment}
            </span>
            <ThemeToggle />
          </div>
        </div>
        <div className="stripe" aria-hidden="true" />
      </header>

      <main id="main" className="container main" tabIndex={-1}>
        {children}
      </main>

      <footer className="container footer">
        <p>
          CivicPulse · complaints are triaged by AI and checked by people. The server decides categories, priorities
          and workflow; this app only shows them.
        </p>
      </footer>

      <nav className="bottom-nav" aria-label="Main">
        {navLinks("bottom-link")}
      </nav>
    </div>
  );
}
