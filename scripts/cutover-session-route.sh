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
  cat > "$config_file" <<'EOF'
location /interview/session/ {
  proxy_http_version 1.1;
  proxy_connect_timeout 5s;
  proxy_read_timeout 120s;
  add_header X-Upstream-Service legacy-yii always;
  proxy_pass http://legacy_service/session/;
}
EOF
else
  cat > "$config_file" <<'EOF'
location /interview/session/ {
  proxy_http_version 1.1;
  proxy_connect_timeout 5s;
  proxy_read_timeout 30s;
  add_header X-Upstream-Service modern-node always;
  proxy_pass http://modern_service/session/;
}
EOF
fi

(
  cd "$project_root"
  docker compose exec -T nginx nginx -s reload >/dev/null
)

echo "Cutover complete: /interview/session/* -> $mode"
