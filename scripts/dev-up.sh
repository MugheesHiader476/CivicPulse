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
    printf 'AUTH_MODE=demo\n'
    printf 'TRIAGE_PROVIDER=rules\n'
    printf 'GROQ_API_KEY=\n'
    printf '# Clerk user IDs permitted to use the Admin dashboard (comma-separated)\n'
    printf 'CLERK_OPERATOR_USER_IDS=demo_operator\n'
  } > .env
fi

set -a
# shellcheck disable=SC1091 -- this file was generated above and is not committed
source .env
set +a

if [[ "${AUTH_MODE:-demo}" == "clerk" ]]; then
  if [[ ! -f frontend/.env.local ]]; then
    printf 'AUTH_MODE=clerk requires frontend/.env.local. Run clerk env pull in frontend/.\n' >&2
    exit 1
  fi
  # Export the ignored Clerk file only to this process; secrets never enter the image.
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
fi

docker compose build backend
docker compose build frontend
docker compose up -d --no-build
if [[ "$local_ai" == "--local" ]]; then
  docker compose --profile local-ai up -d --wait ollama
  docker compose --profile local-ai exec -T ollama sh -c 'ollama pull "$OLLAMA_MODEL"'
  docker compose --profile local-ai exec -T ollama sh -c 'ollama run "$OLLAMA_MODEL" "Reply only ready." >/dev/null'
fi
docker compose exec -T backend python -m app.seed
if [[ "${AUTH_MODE:-demo}" == "demo" ]]; then
  printf 'Citizen demo:  http://127.0.0.1:8080/?demo_role=citizen\n'
  printf 'Operator demo: http://127.0.0.1:8080/?demo_role=operator\n'
else
  printf 'CivicPulse: http://127.0.0.1:8080/sign-in\n'
fi
