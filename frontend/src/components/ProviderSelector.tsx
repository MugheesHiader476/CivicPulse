import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chooseProvider, type ProvidersMeta } from "../api/client";
import { queryKeys } from "../lib/queries";
import "./ProviderSelector.css";

export function ProviderSelector({ meta }: { meta: ProvidersMeta }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: chooseProvider,
    onSuccess: (updated) => queryClient.setQueryData(queryKeys.providers, updated),
  });

  return (
    <section className="card provider-switch" aria-labelledby="provider-switch-title">
      <div>
        <p className="eyebrow">Operator setting</p>
        <h2 id="provider-switch-title">Choose AI triage</h2>
        <p className="chart-sub">
          This choice applies to new complaints for everyone. Existing classifications do not change.
          If the chosen AI fails, keyword rules finish the submission.
        </p>
      </div>
      <div className="provider-switch-grid">
        {(meta.options ?? []).map((option) => {
          const selected = meta.selected_provider === option.id;
          return (
            <div className="provider-switch-option" key={option.id} data-selected={selected || undefined}>
              <div className="provider-switch-head">
                <strong>{option.label}</strong>
                <span>{option.location === "local" ? "On this computer" : "Hosted API"}</span>
              </div>
              <p>Model: <code>{option.model}</code></p>
              <p>{option.location === "local"
                ? "Complaint data stays inside the local stack."
                : "Complaint text is sent to Groq; reporter contact and location are not."}</p>
              {!option.available && <p className="provider-switch-unavailable">{option.reason}</p>}
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!option.available || selected || mutation.isPending}
                onClick={() => mutation.mutate(option.id)}
              >
                {selected ? "Active" : `Use ${option.label}`}
              </button>
            </div>
          );
        })}
      </div>
      {meta.selected_provider === "rules" && (
        <p className="provider-switch-note">Keyword rules are currently active. Select an available AI option above.</p>
      )}
      {mutation.isError && <p role="alert" className="provider-switch-unavailable">{mutation.error.message}</p>}
    </section>
  );
}
