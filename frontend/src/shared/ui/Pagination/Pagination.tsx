"use client";

interface IPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Пагинация с prev/next и компактным отображением страниц-окон с многоточием.
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: IPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(
          (pageNumber) =>
            pageNumber === 1 ||
            pageNumber === totalPages ||
            Math.abs(pageNumber - page) <= 1,
        )
        .reduce<(number | "dots")[]>((accumulator, pageNumber, i, source) => {
          if (i > 0 && pageNumber - (source[i - 1] as number) > 1) {
            accumulator.push("dots");
          }
          accumulator.push(pageNumber);
          return accumulator;
        }, [])
        .map((item, i) =>
          item === "dots" ? (
            <span key={`dots-${i}`} className="px-2 text-gray-300">
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={`w-8 h-8 text-sm rounded-lg transition ${
                item === page
                  ? "bg-nova-blue text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item}
            </button>
          ),
        )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
