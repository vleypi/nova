"use client";
import { useState } from "react";
import { getInviteLink } from "@/shared/config/routes.constant";
import type { ISpace } from "../../interfaces/space.interface";
import { useRegenerateInviteCode } from "../../hooks/useRegenerateInviteCode";

interface ISpaceInviteCodeProps {
  space: ISpace;
}

// Инвайт-ссылка с copy-кнопкой и регенерация invite-кода с подтверждением.
export function SpaceInviteCode({ space }: ISpaceInviteCodeProps) {
  const { mutate: regenerate, isPending } = useRegenerateInviteCode();
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const inviteLink = getInviteLink(space.inviteCode);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    regenerate(space.id, { onSuccess: () => setConfirmRegen(false) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-gray-700">Инвайт-ссылка</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Поделитесь ссылкой, чтобы пригласить участников в пространство
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-w-0">
          <i className="fas fa-link text-gray-400 text-xs flex-shrink-0" />
          <span className="text-sm text-gray-600 truncate font-mono">
            {inviteLink}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex-shrink-0 ${
            copied
              ? "bg-green-50 border-green-200 text-green-600"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
          }`}
        >
          <i className={`fas ${copied ? "fa-check" : "fa-copy"} text-xs`} />
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>

      {!confirmRegen ? (
        <button
          onClick={() => setConfirmRegen(true)}
          className="self-start flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <i className="fas fa-sync-alt text-[10px]" />
          Сгенерировать новый код
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <i className="fas fa-exclamation-triangle text-amber-500 text-xs flex-shrink-0" />
          <p className="text-xs text-amber-700 flex-1">
            Старая ссылка перестанет работать. Продолжить?
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setConfirmRegen(false)}
              disabled={isPending}
              className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isPending}
              className="px-2.5 py-1 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {isPending ? "Генерация..." : "Да, обновить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
