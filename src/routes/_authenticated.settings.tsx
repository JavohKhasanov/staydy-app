import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, X } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  createBranch,
  createObstacleOption,
  createRoom,
  deleteBranch,
  deleteObstacleOption,
  deleteRoom,
  listBranches,
  listObstacleOptions,
  listRooms,
  updateBranch,
  DEFAULT_OBSTACLES,
  type Branch,
  type ObstacleOption,
} from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Sozlamalar — Staydy" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Sozlamalar" description="Markaz filiallari va so'rovnoma sozlamalari" />
      <div className="space-y-6">
        <BranchesCard />
        <RoomsCard />
        <ObstacleOptionsCard />
      </div>
    </div>
  );
}

// BranchesCard manages the center's physical branches (filiallar). Records are scoped to a branch
// via branch_id; deleting a branch keeps its records (they become org-wide).
function BranchesCard() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", address: "", phone: "" });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });
  const branches = data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["branches"] });

  const add = useMutation({
    mutationFn: () => createBranch({ name: form.name.trim(), address: form.address, phone: form.phone }),
    onSuccess: () => {
      setForm({ name: "", address: "", phone: "" });
      toast.success("Filial qo'shildi");
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
  const toggle = useMutation({
    mutationFn: (b: Branch) =>
      updateBranch(b.id, { name: b.name, address: b.address, phone: b.phone, isActive: !b.isActive }),
    onSuccess: invalidate,
    onError: (e) => toast.error(extractApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      toast.success("Filial o'chirildi");
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-2xl">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Filiallar</h2>
        <p className="text-sm text-slate-500 mt-1">
          Markazingiz filiallari. Talaba, guruh va xarajatlarni filialga bog'lash mumkin. Kurslar
          barcha filiallar uchun umumiy.
        </p>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Filial nomi (masalan: Chilonzor)"
            value={form.name}
            maxLength={60}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="flex-1 min-w-40"
          />
          <Input
            placeholder="Manzil"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="flex-1 min-w-32"
          />
          <Input
            placeholder="Telefon"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-36"
          />
          <Button
            onClick={() => form.name.trim() && add.mutate()}
            disabled={add.isPending || !form.name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1.5">Qo'shish</span>
          </Button>
        </div>

        <div className="mt-4">
          {isLoading && <LoadingBlock />}
          {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}
          {!isLoading && !isError && branches.length === 0 && (
            <EmptyBlock title="Filial yo'q" description="Bitta filial bilan ishlayapsiz. Ko'p filial bo'lsa qo'shing." />
          )}
          {branches.length > 0 && (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {branches.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800">{b.name}</span>
                    {!b.isActive && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        Nofaol
                      </span>
                    )}
                    {(b.address || b.phone) && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {[b.address, b.phone].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggle.mutate(b)}
                      className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-50"
                    >
                      {b.isActive ? "To'xtatish" : "Faollashtirish"}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Filialni o'chirasizmi? Yozuvlar umumiy bo'lib qoladi."))
                          del.mutate(b.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 rounded-md p-1 hover:bg-rose-50"
                      aria-label="O'chirish"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// RoomsCard manages the center's physical rooms (xonalar). Lessons pick a room; the schedule
// rejects double-booking a room at overlapping times.
function RoomsCard() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", capacity: "", branchId: "" });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["rooms"],
    queryFn: listRooms,
  });
  const branchesQ = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const branches = branchesQ.data ?? [];
  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name;
  const rooms = data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["rooms"] });

  const add = useMutation({
    mutationFn: () =>
      createRoom({
        name: form.name.trim(),
        capacity: form.capacity ? Number(form.capacity) : 0,
        branchId: form.branchId || undefined,
      }),
    onSuccess: () => {
      setForm((f) => ({ name: "", capacity: "", branchId: f.branchId }));
      toast.success("Xona qo'shildi");
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => {
      toast.success("Xona o'chirildi");
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-2xl">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Xonalar</h2>
        <p className="text-sm text-slate-500 mt-1">
          Dars jadvalida xona tanlanadi. Bitta xona bir vaqtda ikki darsga band bo'lolmaydi.
        </p>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Xona nomi (masalan: 101-xona)"
            value={form.name}
            maxLength={60}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="flex-1 min-w-40"
          />
          <Input
            type="number"
            min="0"
            placeholder="Sig'im"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            className="w-28"
          />
          {branches.length > 0 && (
            <select
              value={form.branchId}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
              className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
              title="Filial"
            >
              <option value="" disabled>
                Filial tanlang
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={() => form.name.trim() && add.mutate()}
            disabled={add.isPending || !form.name.trim() || (branches.length > 0 && !form.branchId)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1.5">Qo'shish</span>
          </Button>
        </div>
        <div className="mt-4">
          {isLoading && <LoadingBlock />}
          {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}
          {!isLoading && !isError && rooms.length === 0 && <EmptyBlock title="Xona yo'q" />}
          {rooms.length > 0 && (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {rooms.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-slate-800">
                    {r.name}
                    {r.capacity > 0 && (
                      <span className="ml-2 text-xs text-slate-400">{r.capacity} o'rin</span>
                    )}
                    <span className="ml-2 text-xs text-indigo-500">
                      {branchName(r.branchId) ?? "Umumiy"}
                    </span>
                  </span>
                  <button
                    onClick={() => del.mutate(r.id)}
                    className="text-slate-400 hover:text-rose-600 rounded-md p-1 hover:bg-rose-50"
                    aria-label="O'chirish"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ObstacleOptionsCard manages the center's "biggest obstacle" choices used by the weekly check-in.
function ObstacleOptionsCard() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["obstacle-options"],
    queryFn: listObstacleOptions,
  });
  const options = data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["obstacle-options"] });

  const createMut = useMutation({
    mutationFn: (l: string) => createObstacleOption(l),
    onSuccess: () => {
      setLabel("");
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteObstacleOption(id),
    onSuccess: invalidate,
    onError: (err) => toast.error(extractApiError(err)),
  });

  const seedMut = useMutation({
    mutationFn: async () => {
      for (const l of DEFAULT_OBSTACLES) await createObstacleOption(l);
    },
    onSuccess: () => {
      toast.success("Standart variantlar qo'shildi");
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const add = () => {
    const l = label.trim();
    if (!l) return;
    if (options.some((o) => o.label.toLowerCase() === l.toLowerCase())) {
      toast.error("Bu variant allaqachon mavjud");
      return;
    }
    createMut.mutate(l);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-2xl">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">
          "Eng katta to'siq" variantlari
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Talaba botda haftalik so'rovnomada shu variantlardan birini tanlaydi. Markazingizga mos
          variantlarni qo'shing. Bo'sh bo'lsa, standart variantlar ishlatiladi.
        </p>
      </div>

      <div className="p-5">
        <div className="flex gap-2">
          <Input
            placeholder="Yangi variant, masalan: Grammatika qiyinligi"
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <Button
            onClick={add}
            disabled={createMut.isPending || !label.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            {createMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ml-1.5">Qo'shish</span>
          </Button>
        </div>

        <div className="mt-4">
          {isLoading && <LoadingBlock />}
          {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}
          {!isLoading && !isError && options.length === 0 && (
            <div className="text-center py-6">
              <EmptyBlock title="Hali variant qo'shilmagan" />
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => seedMut.mutate()}
                disabled={seedMut.isPending}
              >
                {seedMut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Standart to'plamni qo'shish
              </Button>
            </div>
          )}
          {!isLoading && !isError && options.length > 0 && (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {options.map((o: ObstacleOption) => (
                <li key={o.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-slate-800">{o.label}</span>
                  <button
                    onClick={() => deleteMut.mutate(o.id)}
                    disabled={deleteMut.isPending}
                    className="text-slate-400 hover:text-rose-600 rounded-md p-1 hover:bg-rose-50"
                    aria-label="O'chirish"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
