"use client";
import { useAdminHealth } from "../../../hooks/useAdminHealth";
import { AdminPageHeader } from "../UI/AdminPageHeader";

// Страница состояния микросервисов с polling-обновлением раз в 30 сек
export function SystemPage() {
  const { data, isLoading, dataUpdatedAt } = useAdminHealth();

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <AdminPageHeader
        title="Система"
        description="Состояние микросервисов (обновляется каждые 30 сек)"
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-6 ${data.healthy ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${data.healthy ? "bg-green-500" : "bg-red-500"} animate-pulse`}
            />
            {data.healthy ? "Все сервисы работают" : "Есть проблемы"}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {data.services.map((service) => (
              <div
                key={service.name}
                className="bg-white border border-gray-100 rounded-xl p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${service.status === "ok" ? "bg-green-50" : "bg-red-50"}`}
                  >
                    <svg
                      className={`w-5 h-5 ${service.status === "ok" ? "text-green-500" : "text-red-500"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          service.status === "ok"
                            ? "M5 13l4 4L19 7"
                            : "M6 18L18 6M6 6l12 12"
                        }
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {service.name}
                    </p>
                    <p
                      className={`text-xs ${service.status === "ok" ? "text-green-500" : "text-red-500"}`}
                    >
                      {service.status === "ok" ? "Работает" : "Недоступен"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {dataUpdatedAt && (
            <p className="text-xs text-gray-400 mt-4">
              Проверено: {new Date(dataUpdatedAt).toLocaleTimeString("ru-RU")}
            </p>
          )}
        </>
      ) : null}
    </main>
  );
}
