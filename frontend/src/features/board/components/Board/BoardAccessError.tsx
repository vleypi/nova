"use client";
import { useRouter } from "next/navigation";
import { DASHBOARD_ROOT } from "@/shared/config/routes.constant";
interface Props {
  message: string;
}
export function BoardAccessError({ message }: Props) {
  const router = useRouter();
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100">
          <svg
            className="w-7 h-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900">
            Нет доступа к доске
          </h2>
          <p className="text-sm text-gray-500">{message}</p>
        </div>

        <button
          onClick={() => router.push(DASHBOARD_ROOT)}
          className="mt-2 px-5 py-2 rounded-lg bg-nova-blue text-white text-sm font-medium hover:bg-nova-blue/90 transition"
        >
          Вернуться на дашборд
        </button>
      </div>
    </div>
  );
}
