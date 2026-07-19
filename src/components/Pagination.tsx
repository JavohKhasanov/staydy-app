import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 15;

// paginate slices a filtered list for the current page, clamping the page when the list shrinks
// (e.g. a filter changed while on page 3).
export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const safe = Math.min(Math.max(1, page), pages);
  return { rows: items.slice((safe - 1) * pageSize, safe * pageSize), page: safe, pages };
}

// Pagination is the footer bar under a table: count + prev/next. Hidden when one page.
export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5">
      <span className="text-xs text-slate-500">
        Jami {total} ta · {page}/{pages}-sahifa
      </span>
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
