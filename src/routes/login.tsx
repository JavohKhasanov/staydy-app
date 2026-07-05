import { useState } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { api, extractApiError } from "@/lib/api";
import { authStore } from "@/lib/auth";
import type { AuthResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("ss_access_token")) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [{ title: "Kirish — Staydy" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<AuthResponse>("/auth/login", {
        slug,
        email,
        password,
      });
      return res.data;
    },
    onSuccess: (data) => {
      authStore.setSession(data);
      toast.success("Xush kelibsiz!");
      navigate({ to: "/", replace: true });
    },
    onError: (err) => {
      toast.error(extractApiError(err));
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/staydy.png"
            alt="Staydy"
            className="h-24 w-auto object-contain mb-2"
          />
          <p className="text-sm text-slate-500">
            Talabalar muvaffaqiyati boshqaruv paneli
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Tizimga kirish</h2>
          <p className="text-sm text-slate-500 mb-6">
            Markaz ma'lumotlaringiz bilan kiring
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="slug">Markaz identifikatori</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="markaz-slug"
                autoComplete="organization"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="siz@markaz.uz"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Kirish
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}