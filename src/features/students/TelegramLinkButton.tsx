import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Copy, Loader2, Check } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { createTelegramLink, type TelegramLink } from "@/lib/resources";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function TelegramLinkButton({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<TelegramLink | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => createTelegramLink(studentId),
    onSuccess: (data) => setLink(data),
    onError: (err) => toast.error(extractApiError(err)),
  });

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.link);
    setCopied(true);
    toast.success("Havola nusxalandi");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setLink(null);
          setCopied(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Send className="h-4 w-4" />
          Telegram havola
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Telegram ulanish havolasi</DialogTitle>
          <DialogDescription>
            Bu havolani talabaga yuboring. U havolani ochib, har hafta bot orqali
            holatini (motivatsiya, progress, to'siq) belgilaydi.
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <div className="py-2">
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Havola yaratish
            </Button>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                readOnly
                value={link.link}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button variant="outline" size="icon" onClick={copy}>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              {new Date(link.expiresAt).toLocaleDateString("uz-UZ")} gacha amal qiladi.
              Faqat bir marta ishlatiladi.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
