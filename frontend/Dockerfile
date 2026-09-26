# syntax=docker/dockerfile:1.7
# CivicPulse frontend - multi-stage: Node builds, nginx serves. No Node, node_modules or source
# reach the final image. The same image runs in every environment; see nginx/default.conf.template.

# ---- build stage -------------------------------------------------------------
FROM node:22.20.0-alpine3.22 AS build
WORKDIR /app

# Dependencies first, so this layer is cached until package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Type-checks, then bundles to /app/dist. No API URL is baked in: the app calls the relative /api path.
RUN npm run build

# ---- runtime stage -----------------------------------------------------------
FROM nginx:1.30.5-alpine3.24 AS runtime

# Runtime configuration (overridable per environment with -e / env:). Nothing here is secret.
#   API_UPSTREAM               where nginx proxies /api (compose: http://backend:8000,
#                              k8s: http://backend.civicpulse.svc.cluster.local:8000 - nginx does not use search domains)
#   APP_ENV                    label shown in the UI header
#   DASHBOARD_REFRESH_SECONDS  live dashboard polling interval
ENV API_UPSTREAM=http://backend:8000 \
    APP_ENV=production \
    DASHBOARD_REFRESH_SECONDS=15 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# Run as the unprivileged nginx user (uid 101): listen on 8080, keep pid and temp files in /tmp,
# and let the entrypoint render templates into conf.d.
RUN rm -f /etc/nginx/conf.d/default.conf \
 && chown -R nginx:nginx /etc/nginx/conf.d /var/cache/nginx

COPY --chown=nginx:nginx nginx/nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --chown=nginx:nginx nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# The base image's ENTRYPOINT renders the templates, then runs this.
CMD ["nginx", "-g", "daemon off;"]
