#!/usr/bin/env bash
# =====================================================================
# migrate.sh — застосування міграцій у правильному порядку
#
# Використання:
#   export PSYHELP_DB_URL="postgresql://psyhelp_owner:PASS@host:5432/psyhelp"
#   ./migrate.sh
#
# Застосовує файли 01..07 з папки db/ у лексикографічному порядку.
# Зупиняється на першій помилці (ON_ERROR_STOP=1).
# =====================================================================

set -euo pipefail

DB_URL="${PSYHELP_DB_URL:-}"
if [[ -z "$DB_URL" ]]; then
    echo "ERROR: PSYHELP_DB_URL is not set" >&2
    echo "Example: postgresql://psyhelp_owner:password@localhost:5432/psyhelp" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/db"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
    echo "ERROR: migrations directory not found: $MIGRATIONS_DIR" >&2
    exit 1
fi

echo "==> Running migrations from $MIGRATIONS_DIR"
echo "==> Target: $(echo "$DB_URL" | sed 's|://[^@]*@|://***:***@|')"
echo

for file in "$MIGRATIONS_DIR"/0[0-9]_*.sql; do
    [[ -f "$file" ]] || continue
    name="$(basename "$file")"
    echo "==> Applying $name"
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$file"
    echo "    OK"
    echo
done

echo "==> All migrations applied successfully"
