import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Upload, Webhook } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { importRecords, type ImportResult, type ImportRow } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/integration")({
  head: () => ({ meta: [{ title: "Integratsiya — Staydy" }] }),
  component: IntegrationPage,
});

type Row = Record<string, string>;

function parseCsv(text: string): { headers: string[]; rows: Row[] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const split = (line: string) => line.split(",").map((c) => c.trim());
  const headers = split(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = split(line);
    const r: Row = {};
    headers.forEach((h, i) => (r[h] = cells[i] ?? ""));
    return r;
  });
  return { headers, rows };
}

// Column-name aliases for mapping arbitrary CSV headers to the import fields.
const NAME_KEYS = ["name", "ism", "fish", "f.i.sh", "f.i.sh.", "talaba", "student", "o'quvchi"];
const DATE_KEYS = ["date", "sana"];
const PRESENT_KEYS = ["present", "davomat", "keldi", "attendance", "qatnashdi"];
const HW_KEYS = ["homework", "vazifa", "uy vazifa", "uyvazifa", "hw"];

function findCol(headers: string[], keys: string[]): string | undefined {
  return headers.find((h) => keys.includes(h.toLowerCase().trim()));
}

// truthy maps common yes/no spellings (uz/en/symbols) to a boolean; empty → undefined (skip).
function truthy(v: string): boolean | undefined {
  const s = v.toLowerCase().trim();
  if (!s) return undefined;
  if (["1", "true", "ha", "keldi", "bajardi", "yes", "+", "present", "done"].includes(s)) return true;
  if (["0", "false", "yo'q", "yoq", "kelmadi", "bajarmadi", "no", "-", "absent"].includes(s))
    return false;
  return undefined;
}

// normalizeDate accepts YYYY-MM-DD as-is and converts DD.MM.YYYY / DD/MM/YYYY → YYYY-MM-DD.
function normalizeDate(s: string): string {
  const t = s.trim();
  const m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return t;
}

function IntegrationPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const queryClient = useQueryClient();

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setResult(null);
  };

  const mutation = useMutation({
    mutationFn: (importRows: ImportRow[]) => importRecords(importRows),
    onSuccess: (res) => {
      setResult(res);
      toast.success(`${res.imported} ta yozuv import qilindi`);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const handleImport = () => {
    const nameCol = findCol(headers, NAME_KEYS);
    const dateCol = findCol(headers, DATE_KEYS);
    if (!nameCol || !dateCol) {
      toast.error("CSV'da 'ism' va 'sana' ustunlari bo'lishi shart");
      return;
    }
    const presentCol = findCol(headers, PRESENT_KEYS);
    const hwCol = findCol(headers, HW_KEYS);
    const importRows: ImportRow[] = rows
      .map((r) => ({
        name: r[nameCol],
        date: normalizeDate(r[dateCol]),
        present: presentCol ? truthy(r[presentCol]) : undefined,
        homeworkDone: hwCol ? truthy(r[hwCol]) : undefined,
      }))
      .filter((r) => r.name && r.date);
    if (importRows.length === 0) {
      toast.error("Import uchun yaroqli qator topilmadi");
      return;
    }
    mutation.mutate(importRows);
  };

  return (
    <div>
      <PageHeader
        title="Integratsiya"
        description="Ma'lumotlarni import qilish va tashqi tizimlarni ulash"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-900">
                CSV / Excel import
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Davomat va uy vazifa ma'lumotlarini fayldan yuklang. Talabalar nom bo'yicha topiladi.
              </p>
              <p className="text-xs text-slate-400 mt-1.5">
                Ustunlar: <b>ism</b>, <b>sana</b> (YYYY-MM-DD yoki KK.OO.YYYY), ixtiyoriy{" "}
                <b>davomat</b> (keldi/kelmadi), <b>vazifa</b> (bajardi/bajarmadi)
              </p>
              <div className="mt-4">
                <label className="inline-flex items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md">
                  <Upload className="h-4 w-4" />
                  Fayl tanlash
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
                {fileName && (
                  <span className="ml-3 text-xs text-slate-500">{fileName}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Webhook className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-900">
                Modme webhook
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Davomat ma'lumotlarini avtomatik sinxronlash uchun Modme bilan ulanish.
              </p>
              <div className="mt-3 inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                Tez orada
              </div>
              <div className="mt-3">
                <Button variant="outline" size="sm" disabled>
                  Webhook URL olish
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Ko'rib chiqish — {rows.length} qator
            </h3>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Import qilish
            </Button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    {headers.map((h) => (
                      <td key={h} className="px-4 py-2 text-slate-700">
                        {r[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mt-4">
          <h3 className="text-sm font-semibold text-slate-900">Import natijasi</h3>
          <p className="mt-1 text-sm text-emerald-700">
            {result.imported} ta yozuv import qilindi.
          </p>
          {result.skipped.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-sm text-amber-700">
                {result.skipped.length} ta o'tkazib yuborildi:
              </p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-slate-600">
                {result.skipped.slice(0, 50).map((s, i) => (
                  <li key={i}>
                    {s.name || "(nomsiz)"} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}