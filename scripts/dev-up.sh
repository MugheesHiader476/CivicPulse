#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

local_ai="${1:-}"
if [[ $# -gt 1 || ( -n "$local_ai" && "$local_ai" != "--local" ) ]]; then
  printf 'Usage: bash scripts/dev-up.sh [--local]\n' >&2
  exit 2
fi


if [[ ! -f .env ]]; then
  umask 077
  {
    printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)"
    printf 'TRIAGE_PROVIDER=rules\n'
    printf 'GROQ_API_KEY=\n'
    printf '# Clerk user IDs permitted to use the Admin dashboard (comma-separated)\n'
    printf 'CLERK_OPERATOR_USER_IDS=\n'
  } > .env
fi

if [[ ! -f frontend/.env.local ]]; then
  printf 'Clerk keys are missing. In frontend/, run: clerk env pull --app app_3Jmm69F0O22vgMRlShDd1vrx0Iz\n' >&2
  exit 1
fi

# The CLI-generated file is gitignored. Export it only to this shell so Compose can send the
# secret key to FastAPI and the public publishable key to nginx, never vice versa.
set -a
# shellcheck disable=SC1091
source frontend/.env.local
set +a
CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY:-${CLERK_PUBLISHABLE_KEY:-}}"
export CLERK_PUBLISHABLE_KEY
if [[ -z "${CLERK_SECRET_KEY:-}" || ! "$CLERK_PUBLISHABLE_KEY" =~ ^pk_(test|live)_[A-Za-z0-9_=-]+$ ]]; then
  printf 'Clerk keys are incomplete. Re-run clerk env pull in frontend/.\n' >&2
  exit 1
fi
if [[ "$CLERK_PUBLISHABLE_KEY" == pk_test_* ]]; then
  encoded_domain="${CLERK_PUBLISHABLE_KEY#pk_test_}"
else
  encoded_domain="${CLERK_PUBLISHABLE_KEY#pk_live_}"
fi
decoded_domain="$(printf '%s' "$encoded_domain" | tr '_-' '/+' | base64 --decode 2>/dev/null)" || {
  printf 'Could not decode the Clerk publishable key.\n' >&2
  exit 1
}
if [[ ! "$decoded_domain" =~ ^[A-Za-z0-9.-]+\$$ ]]; then
  printf 'Clerk publishable key does not contain a valid frontend API domain.\n' >&2
  exit 1
fi
CLERK_FRONTEND_API_ORIGIN="https://${decoded_domain%?}"
export CLERK_FRONTEND_API_ORIGIN

docker compose build backend
docker compose build frontend
docker compose up -d --no-build
if [[ "$local_ai" == "--local" ]]; then
  docker compose --profile local-ai up -d --wait ollama
  docker compose --profile local-ai exec -T ollama sh -c 'ollama pull "$OLLAMA_MODEL"'
  docker compose --profile local-ai exec -T ollama sh -c 'ollama run "$OLLAMA_MODEL" "Reply only ready." >/dev/null'
fi
docker compose exec -T backend python -m app.seed
printf 'CivicPulse: http://127.0.0.1:8080/sign-in\n'
printf 'Sign in with your Clerk account to use the app.\n'
