
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
CONTAINER="${POSTGRES_CONTAINER:-nova-backend-postgres-1}"
PG_USER="${POSTGRES_USER:-nova}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Запуск бэкапа..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Ошибка: контейнер '${CONTAINER}' не запущен."
  echo "Запустите проект: docker compose up -d"
  exit 1
fi

echo "  Бэкап nova_users..."
docker exec "$CONTAINER" pg_dump -U "$PG_USER" nova_users \
  | gzip > "$BACKUP_DIR/nova_users_${DATE}.sql.gz"
echo "nova_users - backups/nova_users_${DATE}.sql.gz"

echo "Бэкап nova_boards..."
docker exec "$CONTAINER" pg_dump -U "$PG_USER" nova_boards \
  | gzip > "$BACKUP_DIR/nova_boards_${DATE}.sql.gz"
echo "nova_boards - backups/nova_boards_${DATE}.sql.gz"

DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${KEEP_DAYS} -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "Удалено старых бэкапов: $DELETED"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Бэкап завершён."
