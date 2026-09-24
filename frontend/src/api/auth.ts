/** The active Clerk session supplies a fresh token for each API request. */
export type SessionTokenGetter = () => Promise<string | null>;

let tokenGetter: SessionTokenGetter | null = null;

export function setSessionTokenGetter(getter: SessionTokenGetter | null): void {
  tokenGetter = getter;
}

export async function getSessionToken(): Promise<string | null> {
  return tokenGetter ? tokenGetter() : null;
}
