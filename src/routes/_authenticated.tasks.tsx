import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { listTasks, resolveTask as resolveTaskApi } from "@/lib/resources";
import type { InterventionTask } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Vazifalar — Staydy" }] }),
  component: TasksPage,
});

const COLUMNS: { key: string; label: string }[] = [
  { key: "OPEN", label: "Ochiq" },
  { key: "IN_PROGRESS", label: "Jarayonda" },
  { key: "RESOLVED", label: "Hal qilingan" },
];

function TasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [resolveTask, setResolveTask] = useState<InterventionTask | null>(null);
  const [comment, setComment] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["intervention-tasks"],
    queryFn: listTasks,
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!resolveTask) return;
      await resolveTaskApi(resolveTask.id, comment);
    },
    onSuccess: () => {
      toast.success("Vazifa hal qilindi");
      queryClient.invalidateQueries({ queryKey: ["intervention-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setResolveTask(null);
      setComment("");
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const tasks = data ?? [];

  return (
    <div>
      <PageHeader
        title="Vazifalar"
        description="Aralashuv vazifalari Kanban ko'rinishida"
      />
      {isLoading && <LoadingBlock />}
      {isError && (
        <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-slate-100/60 rounded-xl p-3 min-h-[300px]"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-sm font-semibold text-slate-700">
                    {col.label}
                  </h2>
                  <span className="text-xs tabular-nums text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-8">
                    Vazifa yo'q
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow transition-shadow cursor-pointer"
                        onClick={() =>
                          navigate({
                            to: "/students/$id",
                            params: { id: t.student.id },
                          })
                        }
                      >
                        <div className="font-medium text-sm text-slate-900">
                          {t.student.fullName}
                        </div>
                        {t.reasons && t.reasons.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {t.reasons.map((r) => (
                              <span
                                key={r}
                                className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-2">
                          {new Date(t.createdAt).toLocaleDateString("uz-UZ")}
                        </div>
                        {t.status !== "RESOLVED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setResolveTask(t);
                            }}
                          >
                            Hal qilish
                          </Button>
                        )}
                        {t.status === "RESOLVED" && t.resolutionComment && (
                          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 mt-2">
                            {t.resolutionComment}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!isLoading && !isError && tasks.length === 0 && (
        <EmptyBlock title="Hozircha vazifalar yo'q" />
      )}

      <Dialog
        open={!!resolveTask}
        onOpenChange={(o) => {
          if (!o) {
            setResolveTask(null);
            setComment("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vazifani hal qilish</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Talaba: <span className="font-medium">{resolveTask?.student.fullName}</span>
            </p>
            <Textarea
              placeholder="Hal qilish bo'yicha izoh..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResolveTask(null);
                setComment("");
              }}
            >
              Bekor qilish
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={resolveMutation.isPending}
              onClick={() => resolveMutation.mutate()}
            >
              {resolveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Tasdiqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}