#!/usr/bin/env bash
# Migrate users and game data from local postgres to production VPS.
# Run from the repo root on your local machine:
#   bash scripts/migrate-data-to-prod.sh

set -euo pipefail

VPS_SSH="fj-vps"
APP_DIR="/opt/fj"
DUMP_FILE="/tmp/fj_migration_$(date +%Y%m%d_%H%M%S).sql"
REMOTE_DUMP="/tmp/fj_migration.sql"

LOCAL_DB_URL="postgresql://cashflow:cashflow@localhost:5432/cashflow"

TABLES=(
  users
  games
  game_players
  player_financial_state
  player_assets
  player_liabilities
  game_events
  game_chat_messages
)

echo "=== [1/4] Dumping local tables ==="
TABLE_FLAGS=()
for t in "${TABLES[@]}"; do
  TABLE_FLAGS+=(-t "$t")
done

pg_dump \
  --data-only \
  --no-acl \
  --no-owner \
  "${TABLE_FLAGS[@]}" \
  "$LOCAL_DB_URL" \
  > "$DUMP_FILE"

echo "Dump written to $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"

echo ""
echo "=== [2/4] Copying dump to VPS ==="
scp "$DUMP_FILE" "${VPS_SSH}:${REMOTE_DUMP}"
echo "Copied to ${VPS_SSH}:${REMOTE_DUMP}"

echo ""
echo "=== [3/4] Importing on VPS ==="
# shellcheck disable=SC2087
ssh "${VPS_SSH}" bash <<ENDSSH
set -euo pipefail

cd "$APP_DIR"

# Read prod credentials from .env.vps
source <(grep -E '^(POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_DB)=' .env.vps)

CONTAINER=\$(docker compose --env-file .env.vps -f docker-compose.vps.yml ps -q postgres)
if [ -z "\$CONTAINER" ]; then
  echo "ERROR: postgres container is not running" >&2
  exit 1
fi

echo "Postgres container: \$CONTAINER"
echo "Importing data..."

# Wrap entire import in a single psql session with FK checks disabled
{
  echo "SET session_replication_role = replica;"
  cat "$REMOTE_DUMP"
  echo "SET session_replication_role = DEFAULT;"
} | docker exec -i "\$CONTAINER" psql -U "\$POSTGRES_USER" -d "\$POSTGRES_DB"

echo "Import complete."
rm -f "$REMOTE_DUMP"
ENDSSH

echo ""
echo "=== [4/4] Cleanup local dump ==="
rm -f "$DUMP_FILE"
echo "Done. Local dump removed."

echo ""
echo "Migration complete!"
