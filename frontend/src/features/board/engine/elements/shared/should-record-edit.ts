// Возвращает shallow-compare функцию по списку ключей: true если хотя бы одно
// поле различается. Используется handler-ами как `shouldRecordEdit` чтобы пропустить
// commit без реальных изменений (например пользователь открыл sticky → ничего не
// тронул → закрыл).
export function makeShouldRecordEdit<E>(
  keys: readonly (keyof E)[],
): (oldSnapshot: unknown, newSnapshot: unknown) => boolean {
  return (oldSnapshot, newSnapshot) => {
    if (!oldSnapshot || !newSnapshot) return true;
    const a = oldSnapshot as Record<string, unknown>;
    const b = newSnapshot as Record<string, unknown>;
    for (const key of keys) {
      if (a[key as string] !== b[key as string]) return true;
    }
    return false;
  };
}
