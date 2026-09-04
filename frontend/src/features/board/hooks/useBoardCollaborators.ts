"use client";
import { useEffect, useRef, useState } from "react";
import { IWsOnlineUser } from "../engine/types";
import { BoardEngine } from "../engine/BoardEngine";

// Данные курсора одного пользователя для отображения над канвасом.
export interface ICursorData {
  wx: number;
  wy: number;
  user: Pick<IWsOnlineUser, "name" | "avatar">;
}

interface IUseBoardCollaboratorsResult {
  onlineUsers: IWsOnlineUser[];
  cursors: Map<string, ICursorData>;
}

// Подписывается на usersChange/userLeft/cursorUpdated/cursorRemoved.
// Держит локальный список online-пользователей и Map курсоров.
// Курсорные апдейты батчатся через RAF: множество событий от разных пользователей
// в одном кадре дают один setCursors вместо одного на сообщение, иначе BoardPage
// ре-рендерится сотни раз в секунду при активной коллаборации.
export function useBoardCollaborators(
  engine: BoardEngine | null,
): IUseBoardCollaboratorsResult {
  const [onlineUsers, setOnlineUsers] = useState<IWsOnlineUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, ICursorData>>(new Map());

  const pendingRef = useRef<{
    updates: Map<string, ICursorData>;
    removes: Set<string>;
  }>({ updates: new Map(), removes: new Set() });
  const rafIdRef = useRef(0);

  useEffect(() => {
    if (!engine) return;

    // Стабильная ссылка на буфер — pendingRef.current не реассайнится за время эффекта,
    // лок-копия глушит react-hooks/exhaustive-deps warning на cleanup.
    const pending = pendingRef.current;

    const flushCursors = () => {
      rafIdRef.current = 0;
      const { updates, removes } = pending;
      if (updates.size === 0 && removes.size === 0) return;
      setCursors((prev) => {
        const next = new Map(prev);
        for (const [id, data] of updates) next.set(id, data);
        for (const id of removes) next.delete(id);
        return next;
      });
      updates.clear();
      removes.clear();
    };

    const scheduleFlush = () => {
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(flushCursors);
    };

    const unsubUsers = engine.on("usersChange", (users) => {
      setOnlineUsers((prev) => {
        // Один пользователь и он уже в списке — игнорируем (de-dup).
        if (users.length === 1 && prev.some((u) => u.id === users[0].id)) {
          return prev;
        }
        // Один новый — добавляем; иначе батч заменяет весь список.
        if (users.length === 1) return [...prev, users[0]];
        return users;
      });
    });

    const unsubLeft = engine.on("userLeft", (uid) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== uid));
    });

    const unsubCursorUpdated = engine.on("cursorUpdated", (data) => {
      pending.updates.set(data.userId, {
        wx: data.x,
        wy: data.y,
        user: data.user,
      });
      // Если был pending remove для этого id, апдейт его отменяет.
      pending.removes.delete(data.userId);
      scheduleFlush();
    });

    const unsubCursorRemoved = engine.on("cursorRemoved", (userId) => {
      pending.removes.add(userId);
      // Если был pending update для этого id, remove его отменяет.
      pending.updates.delete(userId);
      scheduleFlush();
    });

    return () => {
      unsubUsers();
      unsubLeft();
      unsubCursorUpdated();
      unsubCursorRemoved();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      pending.updates.clear();
      pending.removes.clear();
    };
  }, [engine]);

  return { onlineUsers, cursors };
}
