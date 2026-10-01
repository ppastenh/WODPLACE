import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { randomKey } from "@/lib/ids";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Fase D of the new coach features batch: a coach editing their OWN
// profile (photo, specialty, bio, phone) -- name/email/status/permissions
// stay admin-only, enforced server-side by the "coach edit own profile"
// RLS policy's frozen columns (see
// 20261001180000_coach_self_profile_edit.sql), not just by this form
// omitting them.
export const Route = createFileRoute("/_authenticated/_admin/more/my-profile")({
  head: () => ({
    meta: [
      { title: "Mi perfil — Dlovebox" },
      { name: "description", content: "Tu foto, especialidad, bio y teléfono como coach." },
      { property: "og:title", content: "Mi perfil — Dlovebox" },
      { property: "og:description", content: "Perfil del coach." },
    ],
  }),
  component: MyProfilePage,
});

const MAX_MB = 5;

type CoachProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
};

function MyProfilePage() {
  const { boxId, myCoachId } = useBox();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ phone: "", specialty: "", bio: "" });

  const profile = useQuery({
    queryKey: ["my-coach-profile", boxId, myCoachId],
    enabled: !!myCoachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaches")
        .select("id, name, email, phone, specialty, bio, photo_url")
        .eq("id", myCoachId!)
        .single();
      if (error) throw error;
      return data as CoachProfile;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setForm({
        phone: profile.data.phone ?? "",
        specialty: profile.data.specialty ?? "",
        bio: profile.data.bio ?? "",
      });
    }
  }, [profile.data?.id]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["my-coach-profile", boxId, myCoachId] });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("coaches")
        .update({ phone: form.phone.trim() || null, specialty: form.specialty.trim() || null, bio: form.bio.trim() || null })
        .eq("id", myCoachId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo actualizar el perfil"),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Máx ${MAX_MB}MB`);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sesión no encontrada");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `coach-photos/${auth.user.id}/${randomKey()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("wodplace-uploads")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("wodplace-uploads").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("coaches").update({ photo_url: pub.publicUrl }).eq("id", myCoachId!);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      toast.success("Foto actualizada");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo subir la foto"),
  });

  if (!myCoachId) {
    return (
      <AdminShell title="Mi perfil" showBack>
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Tu cuenta todavía no está vinculada a un perfil de coach en este box.
          </p>
        </div>
      </AdminShell>
    );
  }

  const p = profile.data;

  return (
    <AdminShell title="Mi perfil" showBack>
      <div className="rounded-3xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary">
            {p?.photo_url ? (
              <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-bold">{p?.name ?? "—"}</p>
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Coach
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{p?.email ?? "—"}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-4 w-full rounded-full"
          disabled={uploadPhoto.isPending}
          onClick={() => fileRef.current?.click()}
        >
          {p?.photo_url ? "Cambiar foto" : "Subir foto"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadPhoto.mutate(file);
            e.target.value = "";
          }}
        />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="mt-4 space-y-3 rounded-3xl border bg-card p-5">
        <div>
          <Label>Teléfono</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+56 9 1234 5678" />
        </div>
        <div>
          <Label>Especialidad</Label>
          <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Halterofilia, movilidad, etc." maxLength={80} />
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Una breve presentación" maxLength={300} rows={4} />
        </div>
        <Button type="submit" disabled={save.isPending} className="h-11 w-full rounded-full font-semibold">
          {save.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </AdminShell>
  );
}
