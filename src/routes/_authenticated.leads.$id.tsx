import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import { convertLead, deleteLead, listLeads } from "@/lib/resources";
import { LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "@/features/activities/ActivityTimeline";
import { LeadDialog, STAGE_OPTIONS } from "@/features/leads/LeadDialog";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  head: () => ({ meta: [{ title: "Lid — Staydy" }] }),
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: leads, isLoading } = useQuery({ queryKey: ["leads"], queryFn: listLeads });
  const lead = leads?.find((l) => l.id === id);

  const convert = useMutation({
    mutationFn: () => convertLead(id),
    onSuccess: (res) => {
      toast.success("Talabaga aylantirildi");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate({ to: "/students/$id", params: { id: res.studentId } });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
  const del = useMutation({
    mutationFn: () => deleteLead(id),
    onSuccess: () => {
      toast.success("Lid o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      navigate({ to: "/leads" });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const stageLabel = STAGE_OPTIONS.find((s) => s.key === lead?.stage)?.label ?? lead?.stage;

  return (
    <div>
      <Link
        to="/leads"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Lidlar
      </Link>

      {isLoading && <LoadingBlock />}
      {!isLoading && !lead && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          Lid topilmadi.
        </div>
      )}

      {lead && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-lg font-semibold text-slate-900">{lead.name}</h1>
              <span className="shrink-0 rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-medium">
                {stageLabel}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <Row label="Telefon" value={lead.phone} />
              <Row label="Email" value={lead.email} />
              <Row label="Manba" value={lead.source} />
              <Row label="Qiziqish" value={lead.interest} />
              {lead.note && <div className="text-slate-600 pt-1">{lead.note}</div>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Tahrirlash
              </Button>
              {!lead.studentId && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={convert.isPending}
                  onClick={() => {
                    if (window.confirm("Talabaga aylantirasizmi?")) convert.mutate();
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Talabaga aylantirish
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:bg-rose-50"
                disabled={del.isPending}
                onClick={() => {
                  if (window.confirm("Lidni o'chirasizmi?")) del.mutate();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {lead.studentId && (
              <Link
                to="/students/$id"
                params={{ id: lead.studentId }}
                className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
              >
                Talaba profilini ochish →
              </Link>
            )}
          </div>
          <div className="lg:col-span-2">
            <ActivityTimeline subjectType="lead" subjectId={id} />
          </div>
        </div>
      )}

      {lead && <LeadDialog open={editOpen} onOpenChange={setEditOpen} lead={lead} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-800 text-right">{value}</span>
    </div>
  );
}
