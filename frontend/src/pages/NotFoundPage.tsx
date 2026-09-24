import { Link } from "react-router";
import { Signpost } from "lucide-react";
import { useDocumentTitle } from "../lib/hooks";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <section className="card empty not-found">
      <Signpost size={48} aria-hidden="true" />
      <h1>This street isn&rsquo;t on our map</h1>
      <p>The page you asked for does not exist.</p>
      <Link className="btn btn-primary" to="/">
        Report a problem instead
      </Link>
    </section>
  );
}
