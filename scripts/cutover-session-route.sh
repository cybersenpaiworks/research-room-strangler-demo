#!/usr/bin/env bash
set -euo pipefail

mode="${1:-}"

if [[ "$mode" != "legacy" && "$mode" != "modern" ]]; then
  echo "Usage: ./scripts/cutover-session-route.sh <legacy|modern>" >&2
  exit 1
fi

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="$project_root/nginx/includes/session-route.conf"

if [[ "$mode" == "legacy" ]]; then
  config_contents="$(cat <<'EOF'
location /interview/session/ {
  proxy_http_version 1.1;
  proxy_connect_timeout 5s;
  proxy_read_timeout 120s;
  add_header X-Upstream-Service legacy-yii always;
  proxy_pass http://legacy_service/session/;
}
EOF
)"
else
  config_contents="$(cat <<'EOF'
location /interview/session/ {
  proxy_http_version 1.1;
  proxy_connect_timeout 5s;
  proxy_read_timeout 30s;
  add_header X-Upstream-Service modern-node always;
  proxy_pass http://modern_service/session/;
}
EOF
)"
fi

printf '%s\n' "$config_contents" > "$config_file"

reload_command="cat > /etc/nginx/includes/session-route.conf && nginx -s reload >/dev/null"

if [[ -n "${STACK_NAME:-}" ]]; then
  container_id="$(
    docker ps \
      --filter "label=com.docker.compose.project=$STACK_NAME" \
      --filter "label=com.docker.compose.service=nginx" \
      --quiet \
      | head -n 1
  )"

  if [[ -z "$container_id" ]]; then
    echo "Could not find nginx container for stack '$STACK_NAME'." >&2
    exit 1
  fi

  printf '%s\n' "$config_contents" | docker exec -i "$container_id" sh -lc "$reload_command"
else
  compose_args=()

  if [[ -n "${COMPOSE_FILE:-}" ]]; then
    compose_args+=(-f "$COMPOSE_FILE")
  fi

  if [[ -n "${COMPOSE_PROJECT_NAME:-}" ]]; then
    compose_args+=(-p "$COMPOSE_PROJECT_NAME")
  fi

  (
    cd "$project_root"
    printf '%s\n' "$config_contents" | docker compose "${compose_args[@]}" exec -T nginx sh -lc "$reload_command"
  )
fi

echo "Cutover complete: /interview/session/* -> $mode"
