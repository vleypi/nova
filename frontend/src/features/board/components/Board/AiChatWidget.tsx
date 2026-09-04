"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import aiService, {
  type IAiDoneSummary,
  type AiErrorCode,
} from "@/features/board/services/ai.service";
import { ICamera } from "@/features/board/engine/types";
import type { BoardEngine } from "@/features/board/engine/BoardEngine";

interface IContextSlot {
  slotId: string;
  label: string;
  elementIds: string[];
  elements?: Array<Record<string, unknown>>;
}

const MAX_SLOTS = 10;

interface IUserMessage {
  id: string;
  role: "user";
  text: string;
}
interface IAssistantMessage {
  id: string;
  role: "assistant";
  text: string;
  txId: string | null;
  status: "streaming" | "done";
  progress?: { created: number; updated: number; moved: number; deleted: number };
  summary?: IAiDoneSummary;
  error?: { code: AiErrorCode | string; message: string };
}
interface IErrorMessage {
  id: string;
  role: "error";
  text: string;
}
type IMessage = IUserMessage | IAssistantMessage | IErrorMessage;

type IHistoryEntry = { role: "user" | "assistant"; content: string };

function SendIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

interface ISlotChipProps {
  index: number;
  slot: IContextSlot;
  onFocus: () => void;
  onRemove: () => void;
}

function SlotChip({ index, slot, onFocus, onRemove }: ISlotChipProps) {
  return (
    <div className="group inline-flex items-center gap-1 max-w-full pl-2 pr-1 py-1 rounded-md bg-[#9d6cff]/10 hover:bg-[#9d6cff]/20 text-[#5b2cb8] text-xs font-medium transition-colors">
      <button
        type="button"
        title="Показать на доске"
        onClick={onFocus}
        className="flex items-center gap-1 min-w-0 cursor-pointer outline-none"
      >
        <span className="opacity-60">#{index}</span>
        <span className="truncate max-w-[180px]">{slot.label}</span>
      </button>
      <button
        type="button"
        title="Открепить"
        onClick={onRemove}
        className="ml-0.5 w-4 h-4 flex items-center justify-center rounded text-[#5b2cb8]/60 hover:text-[#5b2cb8] hover:bg-white/40 transition-colors"
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  timeout: "AI не успел ответить за 2 минуты",
  upstream: "Ошибка AI-сервиса. Попробуйте ещё раз.",
  validation: "Запрос некорректен",
  unknown: "Неизвестная ошибка",
};

interface IAiChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  cameraRef: React.RefObject<ICamera>;
  engine: BoardEngine;
}

export function AiChatWidget({
  isOpen,
  onClose,
  boardId,
  engine,
}: IAiChatWidgetProps) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [slots, setSlots] = useState<IContextSlot[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<IHistoryEntry[]>([]);
  const activeAssistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Эмитим количество слотов наружу — SelectionToolbar дизейблит AI-кнопку
  // когда счётчик достиг лимита.
  useEffect(() => {
    engine.emit("aiSlotsCountChange", { count: slots.length });
  }, [engine, slots.length]);

  // Подписка на streaming-чанки текста + прогресс/завершение через EventBus.
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      aiService.onChunkText(({ txId, delta }) => {
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) =>
              m.role === "assistant" &&
              (m.id === activeAssistantIdRef.current || m.txId === txId),
          );
          if (idx === -1) return prev;
          const next = [...prev];
          const target = next[idx] as IAssistantMessage;
          next[idx] = { ...target, text: target.text + delta, txId };
          return next;
        });
      }),
    );

    unsubs.push(
      engine.on("aiElementProgress", (evt) => {
        const { txId, created, updated, moved, deleted } = evt;
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) => m.role === "assistant" && m.txId === txId,
          );
          if (idx === -1) {
            // Привязываем к активному pending bubble (текст ещё не пришёл).
            const active = activeAssistantIdRef.current;
            if (!active) return prev;
            const aidx = prev.findIndex((m) => m.id === active);
            if (aidx === -1) return prev;
            const next = [...prev];
            const target = next[aidx] as IAssistantMessage;
            next[aidx] = {
              ...target,
              txId,
              progress: { created, updated, moved, deleted },
            };
            return next;
          }
          const next = [...prev];
          const target = next[idx] as IAssistantMessage;
          next[idx] = {
            ...target,
            progress: { created, updated, moved, deleted },
          };
          return next;
        });
      }),
    );

    unsubs.push(
      engine.on("aiSlotAdded", (slot) => {
        setSlots((prev) =>
          prev.length >= MAX_SLOTS ? prev : [...prev, slot],
        );
      }),
    );

    unsubs.push(
      engine.on("aiTransactionDone", (evt) => {
        const { txId, ok, summary, error } = evt;
        // НЕ авто-очищаем слоты. Пользователь часто правит ОДИН элемент в
        // несколько итераций («фон жёлтым» → «текст синим» → «подвинь»).
        // Слот живёт, пока его не снимут вручную крестиком, иначе follow-up
        // теряет цель прикрепления.
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) => m.role === "assistant" && m.txId === txId,
          );
          if (idx === -1) return prev;
          const next = [...prev];
          const target = next[idx] as IAssistantMessage;
          next[idx] = {
            ...target,
            status: "done",
            summary,
            error: ok ? undefined : error,
          };
          return next;
        });
        // Финализируем history (для следующего запроса).
        setMessages((prev) => {
          const lastAssistant = [...prev]
            .reverse()
            .find((m) => m.role === "assistant" && m.txId === txId) as
            | IAssistantMessage
            | undefined;
          if (lastAssistant) {
            // Записываем assistant-ход ВСЕГДА, чтобы не нарушить чередование
            // ролей (иначе два user подряд → ошибка API). Если текста не было
            // (AI только менял доску) — кладём краткую синтетическую пометку,
            // чтобы модель в следующем ходе помнила, что уже выполнила.
            const s = lastAssistant.summary;
            const opsNote =
              s && s.created + s.updated + s.moved + s.deleted > 0
                ? `(выполнено на доске: создано ${s.created}, изменено ${s.updated}, перемещено ${s.moved}, удалено ${s.deleted})`
                : "(выполнено)";
            historyRef.current = [
              ...historyRef.current,
              {
                role: "assistant",
                content: lastAssistant.text?.trim() || opsNote,
              },
            ];
          }
          return prev;
        });
        activeAssistantIdRef.current = null;
        setIsLoading(false);
      }),
    );

    unsubs.push(
      aiService.onError((data) => {
        const errText =
          (data.message ?? data.error) || "Ошибка AI. Попробуйте ещё раз.";
        setMessages((prev) => {
          // Убираем pending pустой assistant bubble (если был).
          const filtered = prev.filter(
            (m) => m.id !== activeAssistantIdRef.current,
          );
          return [
            ...filtered,
            { id: crypto.randomUUID(), role: "error", text: errText },
          ];
        });
        activeAssistantIdRef.current = null;
        setIsLoading(false);
      }),
    );

    return () => {
      for (const u of unsubs) u();
    };
  }, [engine]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: IUserMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: IAssistantMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      txId: null,
      status: "streaming",
    };
    activeAssistantIdRef.current = assistantId;

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    // Берём полный hint (включая центр видимой области в мировых координатах),
    // чтобы AI создавал элементы в зоне видимости пользователя, а не в углу.
    const viewportHint = engine.getViewportHint();
    const history = [...historyRef.current];
    historyRef.current = [...history, { role: "user", content: text }];

    const slotsPayload =
      slots.length > 0
        ? slots.map((s) => ({
            slotId: s.slotId,
            label: s.label,
            elementIds: s.elementIds,
            elements: s.elements,
          }))
        : undefined;

    aiService.emitMessage(boardId, text, history, viewportHint, slotsPayload);
  }, [input, isLoading, boardId, engine, slots]);

  const removeSlot = useCallback((slotId: string) => {
    setSlots((prev) => prev.filter((s) => s.slotId !== slotId));
  }, []);

  const focusSlot = useCallback(
    (slot: IContextSlot) => {
      engine.focusOnElements(slot.elementIds);
    },
    [engine],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[60]" onClick={onClose} />}

      <div
        className={`fixed right-4 top-4 bottom-4 w-[380px] z-[70] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 ease-out ${
          isOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-[calc(100%+16px)] opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4262ff] via-[#9d6cff] to-[#ff79d1] flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-gray-900">Nova AI</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4262ff]/10 via-[#9d6cff]/10 to-[#ff79d1]/10 flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-[#9d6cff]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Nova AI</p>
              <p className="text-xs mt-1">Спросите что-нибудь о вашей доске</p>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.role === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md text-sm leading-relaxed whitespace-pre-wrap bg-[#4262ff] text-white">
                    {msg.text}
                  </div>
                </div>
              );
            }
            if (msg.role === "error") {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed whitespace-pre-wrap bg-red-50 text-red-600 border border-red-100">
                    {msg.text}
                  </div>
                </div>
              );
            }
            // assistant
            const showTypingDots = msg.status === "streaming" && msg.text === "";
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] flex flex-col gap-1.5 items-start">
                  {showTypingDots ? (
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed whitespace-pre-wrap bg-gray-100 text-gray-800">
                      {msg.text}
                    </div>
                  )}

                  {msg.status === "streaming" &&
                    msg.progress &&
                    msg.progress.created > 0 && (
                      <div className="text-[11px] text-[#9d6cff] flex items-center gap-1">
                        <span>✨</span>
                        <span>
                          AI: создаёт элементы ({msg.progress.created})…
                        </span>
                      </div>
                    )}

                  {msg.status === "done" && msg.summary && (
                    <div className="flex flex-wrap gap-1">
                      {msg.summary.created > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4262ff]/8 text-[#4262ff] text-[11px] font-medium">
                          ✨ создано {msg.summary.created}
                        </span>
                      )}
                      {msg.summary.updated > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#9d6cff]/8 text-[#9d6cff] text-[11px] font-medium">
                          ✏️ изменено {msg.summary.updated}
                        </span>
                      )}
                      {msg.summary.moved > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                          ↔️ перенесено {msg.summary.moved}
                        </span>
                      )}
                      {msg.summary.deleted > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-medium">
                          🗑️ удалено {msg.summary.deleted}
                        </span>
                      )}
                    </div>
                  )}

                  {msg.status === "done" && msg.error && (
                    <div className="text-[12px] text-red-600">
                      {ERROR_MESSAGES[msg.error.code] ?? msg.error.message}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {slots.length > 0 && (
          <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1 border-t border-gray-100">
            {slots.map((slot, i) => (
              <SlotChip
                key={slot.slotId}
                index={i + 1}
                slot={slot}
                onFocus={() => focusSlot(slot)}
                onRemove={() => removeSlot(slot.slotId)}
              />
            ))}
          </div>
        )}

        <div className={`px-3 py-3 ${slots.length > 0 ? "" : "border-t border-gray-100"}`}>
          <div className="flex items-end gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите Nova AI..."
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm resize-none outline-none placeholder-gray-400 max-h-[80px] disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-[#4262ff] text-white disabled:opacity-30 hover:bg-[#3451e6] transition-colors"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
