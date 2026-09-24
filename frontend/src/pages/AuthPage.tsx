import { SignIn, SignUp } from "@clerk/react";
import { ArrowRight, CheckCircle2, HeartPulse, LockKeyhole, MapPin } from "lucide-react";
import { Link } from "react-router";
import { PulseLogo } from "../components/Pulse";
import { useDocumentTitle } from "../lib/hooks";

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignIn = mode === "sign-in";
  useDocumentTitle(isSignIn ? "Sign in" : "Create account");

  return (
    <div className="auth-page">
      <header className="auth-header container">
        <Link to="/sign-in" className="brand" aria-label="CivicPulse sign in">
          <PulseLogo />
          <span className="brand-word">Civic<span>Pulse</span></span>
        </Link>
        <span className="auth-header-note"><LockKeyhole size={15} aria-hidden="true" /> Account access</span>
      </header>

      <main id="main" className="auth-layout container">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <p className="eyebrow"><span className="auth-eyebrow-dot" /> YOUR CITY, CONNECTED</p>
          <h1 id="auth-story-title">A better city starts with being heard<span className="auth-period">.</span></h1>
          <p className="auth-story-lead">
            Report what needs attention, follow the work, and keep your neighborhood moving forward.
          </p>
          <div className="auth-signal" aria-hidden="true">
            <span className="auth-signal-orbit auth-signal-orbit-outer" />
            <span className="auth-signal-orbit auth-signal-orbit-inner" />
            <span className="auth-signal-core"><HeartPulse size={52} strokeWidth={2.2} /></span>
            <span className="auth-signal-tag auth-signal-tag-top"><MapPin size={14} /> YOUR STREET</span>
            <span className="auth-signal-tag auth-signal-tag-bottom"><CheckCircle2 size={14} /> REAL PROGRESS</span>
          </div>
          <div className="auth-story-footer">
            <span className="auth-story-line" />
            <span>FROM REPORT TO RESOLUTION</span>
          </div>
        </section>

        <section className="auth-panel" aria-labelledby="auth-panel-title">
          <div className="auth-panel-top">
            <span className="auth-panel-index">01 / ACCOUNT</span>
            <span className="auth-panel-mark"><ArrowRight size={18} aria-hidden="true" /></span>
          </div>
          <div className="auth-panel-heading">
            <p className="eyebrow">WELCOME {isSignIn ? "BACK" : "ABOARD"}</p>
            <h2 id="auth-panel-title">{isSignIn ? "Sign in to CivicPulse" : "Create your account"}</h2>
            <p>{isSignIn ? "Pick up where your city left off." : "Join the people making local issues visible."}</p>
          </div>
          <div className="auth-clerk">
            {isSignIn ? (
              <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
            ) : (
              <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
            )}
          </div>
          <p className="auth-switch">
            {isSignIn ? "New here?" : "Already have an account?"}{" "}
            <Link to={isSignIn ? "/sign-up" : "/sign-in"}>
              {isSignIn ? "Create an account" : "Sign in"} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </p>
        </section>
      </main>
      <footer className="auth-footer container">CivicPulse · Local issues. Clear action.</footer>
    </div>
  );
}

export function AuthLoading() {
  return (
    <div className="auth-loading" role="status" aria-live="polite">
      <PulseLogo />
      <span>Connecting your account…</span>
    </div>
  );
}

export function AuthSetupRequired() {
  useDocumentTitle("Sign-in setup required");
  return (
    <main className="auth-loading auth-setup" role="alert">
      <PulseLogo />
      <h1>Sign-in setup required</h1>
      <p>Configure the Clerk publishable key before opening CivicPulse.</p>
    </main>
  );
}
