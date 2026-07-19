import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 15;
const SIZE_OPTIONS = [10, 15, 30, 50];

// usePaged owns page + page-size state for a filtered list. The page is clamped when the list
// shrinks (e.g. a filter changed while on page 3). Spread the result into <Pagination />.
export function usePaged<T>(items: T[]) {
  const [rawPage, setRawPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, rawPage), pages);
  return {
    rows: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pages,
    total: items.length,
    pageSize,
    onPage: setRawPage,
    onPageSize: (n: number) => {
      setPageSize(n);
      setRawPage(1);
    },
  };
}

// Pagination is the footer bar under a table: count, page-size select, prev/next.
// Hidden while the list is small enough to not need it.
export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  if (total <= SIZE_OPTIONS[0]) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">
          Jami {total} ta · {page}/{pages}-sahifa
        </span>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs text-slate-700"
          >
            {SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          tadan
        </label>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" /> Oldingi
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Keyingi <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
