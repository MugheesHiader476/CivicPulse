import { Link } from "react-router";
import { LockKeyhole } from "lucide-react";

export function AccessDeniedPage({ area = "admin" }: { area?: "admin" | "citizen" }) {
  const citizenArea = area === "citizen";
  return (
    <section className="card empty not-found">
      <LockKeyhole size={48} aria-hidden="true" />
      <h1>{citizenArea ? "Citizen access required" : "Admin access required"}</h1>
      <p>{citizenArea ? "This area is for people submitting and tracking their own reports." : "This area is for administrators. You can still submit and track your own reports."}</p>
      <Link className="btn btn-primary" to={citizenArea ? "/dashboard" : "/my-reports"}>
        {citizenArea ? "Admin board" : "My reports"}
      </Link>
    </section>
  );
}
