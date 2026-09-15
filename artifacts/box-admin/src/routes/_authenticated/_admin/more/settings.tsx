import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { randomKey } from "@/lib/ids";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/more/settings")({
  head: () => ({ meta: [{ title: "Configuración — Dlovebox" }, { name: "description", content: "Configuración del panel." }, { property: "og:title", content: "Configuración — Dlovebox" }, { property: "og:description", content: "Configuración." }] }),
  component: SettingsPage,
});

const MAX_MB = 5;

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [email, setEmail] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const photo = useQuery({
    queryKey: ["box-photo", boxId],
    queryFn: async () => {
      const { data, error } = await supabase.from("boxes").select("photo_url").eq("id", boxId).single();
      if (error) throw error;
      return data.photo_url as string | null;
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Máx ${MAX_MB}MB`);
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `box-logos/${boxId}/${randomKey()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("wodplace-uploads")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("wodplace-uploads").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("boxes")
        .update({ photo_url: pub.publicUrl })
        .eq("id", boxId);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      toast.success("Foto del box actualizada");
      qc.invalidateQueries({ queryKey: ["box-photo", boxId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo subir la foto"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("boxes").update({ photo_url: null }).eq("id", boxId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto del box eliminada");
      qc.invalidateQueries({ queryKey: ["box-photo", boxId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar"),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AdminShell title="Configuración" showBack>
      <div className="rounded-3xl border bg-card p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Cuenta</p>
        <p className="mt-1 text-sm font-semibold">{email || "—"}</p>
      </div>

      <div className="mt-4 rounded-3xl border bg-card p-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Foto del box</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Se muestra a tus alumnos en la app — en Inicio, Datos Personales y el detalle del box.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary">
            {photo.data ? (
              <img src={photo.data} alt="Foto del box" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-1 gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              disabled={upload.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {photo.data ? "Cambiar foto" : "Subir foto"}
            </Button>
            {photo.data ? (
              <Button
                variant="outline"
                className="rounded-full text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = "";
          }}
        />
      </div>

      <Button variant="outline" onClick={signOut} className="mt-4 w-full rounded-full h-11 text-destructive border-destructive/30">
        <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
      </Button>
    </AdminShell>
  );
}
