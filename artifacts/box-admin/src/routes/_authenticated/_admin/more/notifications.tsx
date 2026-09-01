import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Megaphone, Send, Trash2, X } from "lucide-react";
import { AnnouncementImage } from "@/components/admin/NotificationsBell";
import { useBox } from "@/lib/box-context";
import { randomKey } from "@/lib/ids";
import {
  fetchAnnouncements,
  formatDate,
  isExpired,
  tryLocalPush,
} from "@/lib/announcements";

export const Route = createFileRoute("/_authenticated/_admin/more/notifications")({
  head: () => ({
    meta: [
      { title: "Avisos — Dlovebox" },
      { name: "description", content: "Envía avisos y notificaciones a los atletas del box." },
      { property: "og:title", content: "Avisos — Dlovebox" },
      { property: "og:description", content: "Crea avisos con foto, push y banner para tus atletas." },
    ],
  }),
  component: NotificationsPage,
});

const DAY_OPTIONS = [1, 3, 7];

function NotificationsPage() {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [push, setPush] = useState(true);
  const [banner, setBanner] = useState(true);
  const [days, setDays] = useState(3);

  const { data: items = [], isLoading } = useQuery({ queryKey: ["announcements", boxId], queryFn: () => fetchAnnouncements(boxId) });

  function pickFile(f: File | null) {
    if (f && f.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB");
      return;
    }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;

      let imagePath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${boxId}/${randomKey()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("announcements").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        imagePath = path;
      }

      const expires = banner ? new Date(Date.now() + days * 86400000).toISOString() : null;
      const { error } = await supabase.from("announcements").insert({
        box_id: boxId,
        title: title.trim(),
        body: body.trim(),
        image_url: imagePath,
        send_push: push,
        show_banner: banner,
        banner_days: days,
        expires_at: expires,
        created_by: uid,
      });
      if (error) throw error;
      if (push) await tryLocalPush(title.trim(), body.trim() || null);
    },
    onSuccess: () => {
      toast.success("Aviso enviado");
      setTitle(""); setBody(""); setFile(null); setPreview(null); setPush(true); setBanner(true); setDays(3);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo enviar el aviso"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("box_id", boxId).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso eliminado");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const canSend = title.trim().length > 0 && !create.isPending;

  return (
    <AdminShell title="Avisos" showBack>
      <section className="rounded-3xl border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary"><Megaphone className="h-4 w-4" /></div>
          <h2 className="text-sm font-bold">Nuevo aviso</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="an-title">Título *</Label>
            <Input id="an-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Cambio de horario el viernes" />
          </div>






          <div className="space-y-1.5">
            <Label htmlFor="an-body">Descripción</Label>
            <Textarea id="an-body" value={body} maxLength={1000} rows={4} onChange={(e) => setBody(e.target.value)} placeholder="Detalle del aviso (opcional)" />
          </div>

          <div className="space-y-1.5">
            <Label>Foto</Label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Vista previa del aviso" className="w-full rounded-2xl object-cover" />
                <button
                  aria-label="Quitar foto"
                  onClick={() => { pickFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed p-5 text-xs text-muted-foreground active:bg-secondary/60"
              >
                <ImagePlus className="h-4 w-4" /> Adjuntar foto
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          </div>

          <ToggleRow label="Notificación push" hint="Avisa a los atletas al enviarlo" checked={push} onChange={setPush} />
          <ToggleRow label="Banner en Inicio del alumno" hint="Se mostrará en la app del atleta" checked={banner} onChange={setBanner} />

          {banner && (
            <div className="space-y-2">
              <Label>Mostrar banner por</Label>
              <div className="flex gap-2">
                {DAY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`flex-1 rounded-full border px-3 py-2 text-xs font-bold ${
                      days === d ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                    }`}
                  >
                    {d} {d === 1 ? "día" : "días"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            disabled={!canSend}
            onClick={() => create.mutate()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground active:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> {create.isPending ? "Enviando…" : "Enviar aviso"}
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Avisos enviados</h2>
        {isLoading ? (
          <p className="text-center text-xs text-muted-foreground">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="rounded-3xl border border-dashed p-8 text-center text-xs text-muted-foreground">Aún no has enviado avisos.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li key={a.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    {a.body && <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isExpired(a) ? "bg-secondary text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                        {isExpired(a) ? "Expirado" : "Activo"}
                      </span>
                      {a.send_push && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">Push</span>}
                      {a.show_banner && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">Banner {a.banner_days}d</span>}
                      <span className="text-[10px] text-muted-foreground">{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                  <button aria-label="Eliminar aviso" onClick={() => remove.mutate(a.id)} className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {a.image_url && <div className="mt-3"><AnnouncementImage path={a.image_url} /></div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
