import type { ElementStore } from "@engine/core/ElementStore";
import { getHandler } from "@engine/elements/element-registry";

// Пересчитывает bbox у коннекторов, которых затронуло изменение.
// Коннектор считается затронутым если его id в affectedIds или один из endpoints
// привязан к элементу из affectedIds. Каждый затронутый коннектор переиндексируется в RBush.
export function refreshConnectorBboxes(
  store: ElementStore,
  affectedIds: Set<string>,
): void {
  if (affectedIds.size === 0) return;
  const handler = getHandler("connector");
  for (const connector of store.getConnectors()) {
    const selfTouched = affectedIds.has(connector.id);
    const startTouched =
      connector.start.kind === "anchor" &&
      affectedIds.has(connector.start.elementId);
    const endTouched =
      connector.end.kind === "anchor" &&
      affectedIds.has(connector.end.elementId);
    if (selfTouched || startTouched || endTouched) {
      handler.computeBbox(connector, store);
      store.reindex(connector.id);
    }
  }
}
