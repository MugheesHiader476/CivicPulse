import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  /** When this value changes (e.g. the route), a caught error is cleared. */
  resetKey?: unknown;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so one broken view never blanks the whole app.
 * API failures are handled in the views themselves; this is the last line of defence.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[CivicPulse] view crashed", error, info.componentStack);
  }

  override componentDidUpdate(prevProps: Props): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private readonly reset = () => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <section className="card crash" role="alert" aria-labelledby="crash-title">
        <div className="crash-icon" aria-hidden="true">
          <TriangleAlert size={34} strokeWidth={2.4} />
        </div>
        <h1 id="crash-title">This screen hit a snag</h1>
        <p>
          Something in the interface broke while showing this page. Your data is safe on the server; only this view
          failed.
        </p>
        <pre className="crash-message">{error.message}</pre>
        <div className="row-actions">
          <button type="button" className="btn btn-primary" onClick={this.reset}>
            <RotateCcw size={18} aria-hidden="true" /> Try again
          </button>
          <a className="btn btn-ghost" href="/">
            Back to the report form
          </a>
        </div>
      </section>
    );
  }
}
