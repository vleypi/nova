"use client";
import { useEffect, useRef, useState, MutableRefObject } from "react";
import { ICamera } from "@/features/board/engine/types";
import { ICursorData } from "@/features/board/hooks/useBoardPage";
import { CURSOR_THROTTLE_MS } from "@/features/board/constants/board.constant";
interface IProps {
  cursors: Map<string, ICursorData>;
  cameraRef: MutableRefObject<ICamera>;
}
const CURSOR_COLORS = [
  "#4262ff",
  "#9d6cff",
  "#ff79d1",
  "#7fd6c2",
  "#ffd233",
  "#ff6b6b",
];
const UPDATE_MS = CURSOR_THROTTLE_MS;
function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++)
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
interface ICursorEntry {
  fromWx: number;
  fromWy: number;
  toWx: number;
  toWy: number;
  updatedAt: number;
  name: string;
  color: string;
}
export function RemoteCursors({ cursors, cameraRef }: IProps) {
  const [userIds, setUserIds] = useState<string[]>([]);
  const entriesRef = useRef<Map<string, ICursorEntry>>(new Map());
  const elRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const now = Date.now();
    const entries = entriesRef.current;
    for (const [userId, { wx, wy, user }] of cursors.entries()) {
      const prev = entries.get(userId);
      if (prev) {
        const t = Math.min(1, (now - prev.updatedAt) / UPDATE_MS);
        prev.fromWx = prev.fromWx + (prev.toWx - prev.fromWx) * t;
        prev.fromWy = prev.fromWy + (prev.toWy - prev.fromWy) * t;
        prev.toWx = wx;
        prev.toWy = wy;
        prev.updatedAt = now;
        prev.name = user.name;
      } else {
        entries.set(userId, {
          fromWx: wx,
          fromWy: wy,
          toWx: wx,
          toWy: wy,
          updatedAt: now - UPDATE_MS,
          name: user.name,
          color: getUserColor(userId),
        });
      }
    }
    for (const userId of entries.keys()) {
      if (!cursors.has(userId)) {
        entries.delete(userId);
        elRefs.current.delete(userId);
      }
    }
    setUserIds([...cursors.keys()]);
  }, [cursors]);
  const hasCursors = userIds.length > 0;
  useEffect(() => {
    if (!hasCursors) return;
    const loop = () => {
      const now = Date.now();
      const cam = cameraRef.current;
      const entries = entriesRef.current;
      for (const [userId, entry] of entries.entries()) {
        const el = elRefs.current.get(userId);
        if (!el) continue;
        const t = Math.min(1, (now - entry.updatedAt) / UPDATE_MS);
        const wx = entry.fromWx + (entry.toWx - entry.fromWx) * t;
        const wy = entry.fromWy + (entry.toWy - entry.fromWy) * t;
        const sx = wx * cam.zoom + cam.x;
        const sy = wy * cam.zoom + cam.y;
        el.style.transform = `translate(${sx}px, ${sy}px)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hasCursors]);
  if (userIds.length === 0) return null;
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 100 }}
    >
      {userIds.map((userId) => {
        const entry = entriesRef.current.get(userId);
        if (!entry) return null;
        return (
          <div
            key={userId}
            ref={(el) => {
              elRefs.current.set(userId, el);
            }}
            className="absolute top-0 left-0 select-none"
            style={{
              willChange: "transform",
              transform: "translate(-9999px,-9999px)",
            }}
          >
            <svg
              width="22"
              height="26"
              viewBox="0 0 22 26"
              fill="none"
              style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.30))" }}
            >
              <path
                d="M3 1 L3 20 L7.5 15 L11 23 L14 21.5 L10.5 14 L18 14 Z"
                fill={entry.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>

            <div
              className="absolute text-white font-semibold whitespace-nowrap rounded-full px-2 shadow-sm"
              style={{
                backgroundColor: entry.color,
                top: 18,
                left: 13,
                fontSize: 11,
                lineHeight: "18px",
              }}
            >
              {entry.name || "?"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
