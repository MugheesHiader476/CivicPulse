// Operator credentials live only in memory. They are never bundled, placed in URLs,
// stored in browser storage, or sent to public submission/statistics endpoints.
let token = "";

export function getOperatorToken(): string {
  return token;
}

export function setOperatorToken(value: string): void {
  token = value.trim();
}

export function isOperatorPath(path: string, method: string): boolean {
  return path === "/api/meta/providers" || path.startsWith("/api/complaints/") || (path === "/api/complaints" && method === "GET");
}
