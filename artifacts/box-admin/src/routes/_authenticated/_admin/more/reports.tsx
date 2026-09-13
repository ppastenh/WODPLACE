import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ImagePlus, X, CheckCircle2, Clock, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { randomKey } from "@/lib/ids";

export const Route = createFileRoute("/_authenticated/_admin/more/reports")({
  head: () => ({
    meta: [
      { title: "Soporte — Dlovebox" },
      { name: "description", content: "Reportá un problema al equipo de WODPLACE." },
      { property: "og:title", content: "Soporte — Dlovebox" },
      { property: "og:description", content: "Reportá un bug o falla de la app." },
    ],
  }),
  component: SupportPage,
});

const MAX_MB = 8;

type SupportReport = {
  id: string;
  description: string;
  image_url: string | null;
  created_at: string;
  resolved_at: string | null;
};

async function fetchMyReports(): Promise<SupportReport[]> {
  const { data, error } = await supabase
    .from("support_reports")
    .select("id, description, image_url, created_at, resolved_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function SupportPage() {
  const { boxId } = useBox();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ["support-reports", "mine"], queryFn: fetchMyReports });

  const submit = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user?.email) throw new Error("Sesión inválida");

      let imageUrl: string | null = null;
      if (image) {
        const ext = image.name.split(".").pop() ?? "jpg";
        const path = `support/${user.id}/${randomKey()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("wodplace-uploads")
          .upload(path, image, { contentType: image.type || "image/jpeg" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("wodplace-uploads").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("support_reports").insert({
        id: `support-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        reporter_user_id: user.id,
        reporter_email: user.email,
        box_id: boxId,
        description: description.trim(),
        image_url: imageUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reporte enviado. El equipo de WODPLACE lo va a revisar.");
      setDescription("");
      setImage(null);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["support-reports", "mine"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo enviar el reporte"),
  });

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Máx ${MAX_MB}MB`);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  const reports = data ?? [];

  return (
    <AdminShell title="Soporte" showBack>
      <div className="space-y-4">
        <div className="rounded-3xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Reportar un problema</p>
              <p className="text-xs text-muted-foreground">Le llega directo al equipo de WODPLACE, no es visible para tus atletas.</p>
            </div>
          </div>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contanos qué pasó, qué esperabas que pase, y en qué pantalla estabas..."
            rows={5}
            className="resize-none"
          />

          {preview ? (
            <div className="relative mt-3 inline-block">
              <img src={preview} alt="Captura adjunta" className="h-28 rounded-xl border object-cover" />
              <button
                type="button"
                onClick={() => { setImage(null); setPreview(null); }}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground"
            >
              <ImagePlus className="h-4 w-4" /> Adjuntar captura (opcional)
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />

          <Button
            className="mt-4 w-full rounded-full"
            disabled={!description.trim() || submit.isPending}
            onClick={() => submit.mutate()}
          >
            Enviar reporte
          </Button>
        </div>

        {reports.length > 0 ? (
          <div>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Mis reportes anteriores
            </h2>
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="rounded-2xl border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 flex-1 text-xs">{r.description}</p>
                    {r.resolved_at ? (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resuelto
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Pendiente
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("es-CL")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
