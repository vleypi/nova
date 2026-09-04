
set -e

DATABASE="$1"
BACKUP_FILE="$2"
CONTAINER="${POSTGRES_CONTAINER:-nova-backend-postgres-1}"
PG_USER="${POSTGRES_USER:-nova}"

if [ -z "$DATABASE" ] || [ -z "$BACKUP_FILE" ]; then
  echo "Использование: $0 <database> <backup_file>"
  echo ""
  echo "  database:    nova_users | nova_boards"
  echo "  backup_file: путь до .sql.gz файла"
  echo ""
  echo "Пример:"
  echo "  $0 nova_users backups/nova_users_20260401_120000.sql.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Ошибка: файл бэкапа не найден: $BACKUP_FILE"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Ошибка: контейнер '${CONTAINER}' не запущен."
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Восстановление $DATABASE из $BACKUP_FILE..."
echo "ВНИМАНИЕ: текущие данные в '$DATABASE' будут перезаписаны!"
read -r -p "Продолжить? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Отменено."
  exit 0
fi

docker exec "$CONTAINER" psql -U "$PG_USER" -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DATABASE}' AND pid <> pg_backend_pid();" \
  postgres > /dev/null

gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$PG_USER" "$DATABASE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Восстановление завершено."
