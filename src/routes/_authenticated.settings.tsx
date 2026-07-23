import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, X } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  changePassword,
  createBranch,
  createShopItem,
  deleteShopItem,
  getBillingSettings,
  getGamification,
  listShopItems,
  setGamification,
  updateBillingSettings,
  updateShopItem,
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
  type Gamification,
  type ObstacleOption,
  type ShopItem,
} from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <BillingRulesCard />
        <GamificationCard />
        <ShopCard />
        <ObstacleOptionsCard />
        <PasswordCard />
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


// PasswordCard lets the signed-in user change their own login password.
function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const save = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      toast.success("Parol o'zgartirildi");
      setCurrent("");
      setNext("");
      setConfirm("");
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSave = current.length > 0 && next.length >= 8 && next === confirm;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-2xl">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Parolni o'zgartirish</h2>
        <p className="text-sm text-slate-500 mt-1">O'z hisobingiz parolini yangilang (kamida 8 belgi).</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) save.mutate();
        }}
        className="grid gap-3 p-5 sm:max-w-sm"
      >
        <div>
          <Label className="text-xs font-medium text-slate-600">Joriy parol</Label>
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600">Yangi parol</Label>
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            placeholder="kamida 8 belgi"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600">Yangi parolni tasdiqlang</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="mt-1"
          />
          {mismatch && <p className="mt-1 text-xs text-rose-600">Parollar mos kelmayapti</p>}
        </div>
        <Button
          type="submit"
          disabled={!canSave || save.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white justify-self-start"
        >
          {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Saqlash
        </Button>
      </form>
    </div>
  );
}

// GamificationCard tunes the XP/coin economy for the student mini app.
function GamificationCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["gamification"], queryFn: getGamification });
  const [form, setForm] = useState<Gamification | null>(null);
  const cfg = form ?? q.data ?? null;

  const save = useMutation({
    mutationFn: () => setGamification(cfg!),
    onSuccess: () => {
      toast.success("Saqlandi");
      qc.invalidateQueries({ queryKey: ["gamification"] });
      setForm(null);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const set = (k: keyof Gamification, v: string) =>
    setForm({ ...(cfg as Gamification), [k]: Number(v) || 0 });

  const fields: { k: keyof Gamification; label: string }[] = [
    { k: "xpAttend", label: "Davomat (vaqtida) XP" },
    { k: "xpLate", label: "Davomat (kech) XP" },
    { k: "xpHomeworkMax", label: "Vazifa maks. XP" },
    { k: "xpCheckin", label: "Check-in XP" },
    { k: "levelSize", label: "Bosqich uchun XP" },
    { k: "coinBase", label: "Kumush kursi (asos)" },
    { k: "coinStep", label: "Kumush kursi (qadam)" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-2xl">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Gamifikatsiya</h2>
        <p className="text-sm text-slate-500 mt-1">
          Talaba ilovasidagi XP/kumush iqtisodi. Kumush = XP × (asos + (bosqich−1)×qadam).
        </p>
      </div>
      <div className="p-5">
        {q.isLoading || !cfg ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fields.map((f) => (
                <div key={f.k}>
                  <Label className="text-xs text-slate-600">{f.label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={cfg[f.k]}
                    onChange={(e) => set(f.k, e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              ))}
            </div>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Saqlash
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ShopCard manages the reward-shop items students buy with coins.
function ShopCard() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", icon: "🎁", price: "" });
  const q = useQuery({ queryKey: ["shop-items"], queryFn: listShopItems });
  const items = q.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["shop-items"] });

  const add = useMutation({
    mutationFn: () =>
      createShopItem({ name: form.name.trim(), icon: form.icon, price: Number(form.price) || 0, isActive: true }),
    onSuccess: () => {
      setForm({ name: "", icon: "🎁", price: "" });
      toast.success("Mahsulot qo'shildi");
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
  const toggle = useMutation({
    mutationFn: (it: ShopItem) =>
      updateShopItem(it.id, { name: it.name, icon: it.icon, price: it.price, isActive: !it.isActive }),
    onSuccess: invalidate,
    onError: (e) => toast.error(extractApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteShopItem(id),
    onSuccess: () => {
      toast.success("O'chirildi");
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-2xl">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Do'kon</h2>
        <p className="text-sm text-slate-500 mt-1">Talabalar kumushga sotib oladigan mukofotlar.</p>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Emoji"
            value={form.icon}
            maxLength={4}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            className="w-16 text-center"
          />
          <Input
            placeholder="Nomi (masalan: Oltin nishon)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="flex-1 min-w-40"
          />
          <Input
            type="number"
            min="0"
            placeholder="Narx (kumush)"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
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
          {q.isLoading && <LoadingBlock />}
          {!q.isLoading && items.length === 0 && <EmptyBlock title="Mahsulot yo'q" />}
          {items.length > 0 && (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-slate-800">
                    <span className="text-lg">{it.icon}</span>
                    {it.name}
                    <span className="text-xs text-amber-600">🪙 {it.price}</span>
                    {!it.isActive && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Nofaol</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggle.mutate(it)}
                      className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-50"
                    >
                      {it.isActive ? "To'xtatish" : "Faollashtirish"}
                    </button>
                    <button
                      onClick={() => del.mutate(it.id)}
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

// BillingRulesCard: center billing rules — how many attended sessions before the missing-invoice
// flag fires ("N darsgacha to'lovsiz qatnashish mumkin").
function BillingRulesCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["billing-settings"], queryFn: getBillingSettings });
  const [val, setVal] = useState<string | null>(null);
  const current = val ?? String(q.data?.graceLessons ?? 3);

  const save = useMutation({
    mutationFn: () => updateBillingSettings(Number(current)),
    onSuccess: () => {
      toast.success("Saqlandi");
      qc.invalidateQueries({ queryKey: ["billing-settings"] });
      qc.invalidateQueries({ queryKey: ["payment-alerts"] });
      setVal(null);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-2xl">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">To'lov mezonlari</h2>
        <p className="text-sm text-slate-500 mt-1">
          Yangi o'quvchi nechta darsgacha to'lovsiz qatnashishi mumkin. Shundan oshsa guruh
          to'lovlarida va bildirishnomalarda "To'lov kutilmoqda" belgisi chiqadi.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2 p-5">
        <div>
          <Label className="text-xs font-medium text-slate-600">To'lovsiz darslar soni</Label>
          <Input
            type="number"
            min="0"
            max="30"
            value={current}
            onChange={(e) => setVal(e.target.value)}
            className="mt-1 w-32"
          />
        </div>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || val === null}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span className={save.isPending ? "ml-1.5" : ""}>Saqlash</span>
        </Button>
      </div>
    </div>
  );
}
