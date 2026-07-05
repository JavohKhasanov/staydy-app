import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { createActivity, deleteActivity, listActivities } from "@/lib/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_META: Record<string, { label: string; cls: string }> = {
  call: { label: "Qo'ng'iroq", cls: "bg-sky-50 text-sky-700" },
  sms: { label: "SMS", cls: "bg-violet-50 text-violet-700" },
  note: { label: "Izoh", cls: "bg-slate-100 text-slate-600" },
  meeting: { label: "Uchrashuv", cls: "bg-amber-50 text-amber-700" },
};

// ActivityTimeline is a reusable communication log for a lead or student.
export function ActivityTimeline({
  subjectType,
  subjectId,
}: {
  subjectType: "lead" | "student";
  subjectId: string;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("call");
  const [body, setBody] = useState("");
  const key = ["activities", subjectType, subjectId];

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => listActivities(subjectType, subjectId),
  });
  const list = data ?? [];

  const add = useMutation({
    mutationFn: () => createActivity({ subjectType, subjectId, type, body }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Aloqa tarixi</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) add.mutate();
        }}
        className="flex gap-2 mb-4"
      >
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-32 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">Qo'ng'iroq</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="note">Izoh</SelectItem>
            <SelectItem value="meeting">Uchrashuv</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Nima bo'ldi?"
        />
        <Button
          type="submit"
          disabled={add.isPending || !body.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
        >
          {add.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Qo'shish
        </Button>
      </form>

      {list.length === 0 ? (
        <p className="text-sm text-slate-500">Hali aloqa yozuvi yo'q.</p>
      ) : (
        <ul className="space-y-2.5">
          {list.map((a) => {
            const meta = TYPE_META[a.type] ?? { label: a.type, cls: "bg-slate-100 text-slate-600" };
            return (
              <li key={a.id} className="flex gap-3 text-sm group">
                <span
                  className={`shrink-0 h-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
                >
                  {meta.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-800 break-words">{a.body}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {a.author ? `${a.author} · ` : ""}
                    {a.createdAt.slice(0, 16).replace("T", " ")}
                  </div>
                </div>
                <button
                  onClick={() => del.mutate(a.id)}
                  className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100"
                  aria-label="O'chirish"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
