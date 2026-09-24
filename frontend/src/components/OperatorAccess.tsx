import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getOperatorToken, setOperatorToken } from "../api/operator";
import { runtimeConfig } from "../config";

export function OperatorAccess() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [active, setActive] = useState(Boolean(getOperatorToken()));
  if (runtimeConfig.environment === "mock-api") return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    setOperatorToken(draft);
    setDraft("");
    setActive(Boolean(getOperatorToken()));
    void queryClient.invalidateQueries();
  }

  function clear() {
    setOperatorToken("");
    setActive(false);
    queryClient.clear();
  }

  return (
    <form onSubmit={submit} className="operator-access" autoComplete="off">
      <label htmlFor="operator-token" className="visually-hidden">Operator access token</label>
      <input id="operator-token" type="password" value={draft} onChange={(event) => setDraft(event.target.value)}
        placeholder="Operator token" autoComplete="off" required aria-label="Operator access token" />
      <button type="submit" className="btn btn-ghost btn-sm">{active ? "Update access" : "Unlock board"}</button>
      {active && <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>Lock</button>}
    </form>
  );
}
