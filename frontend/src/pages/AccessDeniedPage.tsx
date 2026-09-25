import { Link } from "react-router";
import { LockKeyhole } from "lucide-react";

export function AccessDeniedPage() {
  return (
    <section className="card empty not-found">
      <LockKeyhole size={48} aria-hidden="true" />
      <h1>Operator access required</h1>
      <p>Your account can report issues and view city stats. An operator account is needed to open the complaint board.</p>
      <Link className="btn btn-primary" to="/">Report a problem</Link>
    </section>
  );
}
