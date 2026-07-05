import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import { convertLead, deleteLead, listLeads, setLeadStage, type Lead } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadDialog, STAGE_OPTIONS } from "@/features/leads/LeadDialog";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({ meta: [{ title: "Lidlar — Staydy" }] }),
  component: LeadsPage,
});

const STAGE_BORDER: Record<string, string> = {
  new: "border-t-slate-400",
  contacted: "border-t-sky-400",
  trial: "border-t-amber-400",
  enrolled: "border-t-emerald-400",
  lost: "border-t-rose-400",
};

function LeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leads"],
    queryFn: listLeads,
  });
  const leads = data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => setLeadStage(id, stage),
    onSuccess: invalidate,
    onError: (e) => toast.error(extractApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      toast.success("Lid o'chirildi");
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
  const convert = useMutation({
    mutationFn: (id: string) => convertLead(id),
    onSuccess: (res) => {
      toast.success("Talabaga aylantirildi");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate({ to: "/students/$id", params: { id: res.studentId } });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Lidlar"
        description="Sotuv voronkasi — potensial talabalar"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yangi lid
          </Button>
        }
      />

      {isLoading && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <LoadingBlock />
        </div>
      )}
      {isError && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />
        </div>
      )}
      {!isLoading && !isError && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGE_OPTIONS.map((stage) => {
            const col = leads.filter((l) => l.stage === stage.key);
            return (
              <div key={stage.key} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold text-slate-700">{stage.label}</span>
                  <span className="text-xs text-slate-400">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((l) => (
                    <div
                      key={l.id}
                      className={`bg-white border border-slate-200 border-t-2 ${
                        STAGE_BORDER[l.stage] ?? ""
                      } rounded-lg p-3 shadow-sm`}
                    >
                      <Link
                        to="/leads/$id"
                        params={{ id: l.id }}
                        className="font-medium text-slate-900 text-sm hover:text-indigo-600"
                      >
                        {l.name}
                      </Link>
                      {l.phone && <div className="text-xs text-slate-500 mt-0.5">{l.phone}</div>}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {l.source && (
                          <span className="text-[10px] rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5">
                            {l.source}
                          </span>
                        )}
                        {l.interest && (
                          <span className="text-[10px] rounded-full bg-indigo-50 text-indigo-600 px-1.5 py-0.5">
                            {l.interest}
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center gap-1">
                        <Select value={l.stage} onValueChange={(v) => move.mutate({ id: l.id, stage: v })}>
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGE_OPTIONS.map((s) => (
                              <SelectItem key={s.key} value={s.key}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!l.studentId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-emerald-700 hover:bg-emerald-50"
                            title="Talabaga aylantirish"
                            disabled={convert.isPending}
                            onClick={() => {
                              if (window.confirm(`"${l.name}"ni talabaga aylantirasizmi?`))
                                convert.mutate(l.id);
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-slate-500 hover:text-indigo-600"
                          onClick={() => {
                            setEditing(l);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-rose-600 hover:bg-rose-50"
                          disabled={del.isPending}
                          onClick={() => {
                            if (window.confirm("Lidni o'chirasizmi?")) del.mutate(l.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {col.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editing} />
    </div>
  );
}
