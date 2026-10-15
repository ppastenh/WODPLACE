import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { randomKey } from "@/lib/ids";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, FileImage, FileType2, Upload, RefreshCw, Trash2, Plus, ExternalLink, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/more/files")({
  head: () => ({
    meta: [
      { title: "Contratos — WODPLACE" },
      { name: "description", content: "Contratos que ven y aceptan los atletas de este box." },
      { property: "og:title", content: "Contratos — WODPLACE" },
      { property: "og:description", content: "Sube y gestiona los contratos de tu box." },
    ],
  }),
  component: FilesPage,
});

const ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";
const MAX_MB = 20;

type Contract = {
  id: string;
  slug: string;
  title: string;
  doc_type: string;
  file_name: string | null;
  mime_type: string | null;
  object_path: string | null;
  created_at: string;
  updated_at: string;
};

function iconFor(mime: string | null) {
  if (mime?.startsWith("image/")) return FileImage;
  if (mime?.includes("pdf")) return FileType2;
  return FileText;
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || `doc-${randomKey()}`;
}

async function fetchContracts(boxId: string) {
  const { data, error } = await supabase
    .from("contract_documents")
    .select("*")
    .eq("box_id", boxId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contract[];
}

async function fetchStats(boxId: string) {
  const [{ count: total }, { data: reads }] = await Promise.all([
    supabase.from("box_members").select("user_id", { count: "exact", head: true }).eq("box_id", boxId),
    supabase.from("contract_read_progress").select("document_slug").eq("box_id", boxId),
  ]);
  const counts = new Map<string, number>();
  for (const row of reads ?? []) counts.set(row.document_slug, (counts.get(row.document_slug) ?? 0) + 1);
  return { totalMembers: total ?? 0, bySlug: counts };
}

/**
 * The only way to create/replace a contract document as of Fase B/B1 —
 * contract_documents has no insert/update RLS policy at all, not even for
 * the box's owner, so a direct supabase.from("contract_documents").upsert
 * would just silently affect 0 rows. This function does its own
 * owner/super_admin check (auth.uid()) and, when requiresReacceptance is
 * true, archives the OLD version + every current reader's read-progress
 * into history and clears that one document's read-progress (not the
 * other two). Inserts a brand-new row when the slug doesn't exist yet for
 * this box — a box with zero contracts today can create its first one
 * here exactly the same way it replaces an existing one.
 */
async function replaceContractDocument(args: {
  boxId: string;
  slug: string;
  title: string;
  objectPath: string;
  fileName: string;
  mimeType: string;
  requiresReacceptance: boolean;
}) {
  const { error } = await supabase.rpc("replace_contract_document", {
    p_box_id: args.boxId,
    p_slug: args.slug,
    p_title: args.title,
    p_object_path: args.objectPath,
    p_file_name: args.fileName,
    p_mime_type: args.mimeType,
    p_requires_reacceptance: args.requiresReacceptance,
  });
  if (error) throw error;
}

async function deleteContractDocument(boxId: string, slug: string) {
  const { error } = await supabase.rpc("delete_contract_document", {
    p_box_id: boxId,
    p_slug: slug,
  });
  if (error) throw error;
}

function FilesPage() {
  const qc = useQueryClient();
  const { boxId, isOwner } = useBox();
  const { data: contracts = [], isLoading } = useQuery({ queryKey: ["contracts", boxId], queryFn: () => fetchContracts(boxId) });
  const { data: stats } = useQuery({ queryKey: ["contract-stats", boxId], queryFn: () => fetchStats(boxId) });
  const [open, setOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["contract-stats"] });
  };

  if (!isOwner) {
    return (
      <AdminShell title="Contratos" showBack>
        <div className="rounded-3xl border bg-card p-8 text-center">
          <p className="text-sm font-semibold">No tienes permiso para ver los contratos</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Solo el dueño de este box (o un super administrador) puede ver y modificar los
            contratos que aceptan los atletas.
          </p>
        </div>
      </AdminShell>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <AdminShell title="Contratos" showBack right={
        <DialogTrigger asChild>
          <button aria-label="Subir contrato" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
          </button>
        </DialogTrigger>
      }>
        <div className="mb-4 rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Contratos de tu box</p>
          <p className="mt-1 text-sm">
            Lo que subas aquí se muestra a los atletas de <span className="font-semibold">este box</span> en
            Contratos Activos. Puedes tener cualquier combinación de los tres documentos (membresía,
            salud, reglamento) — mientras no subas ninguno, tus atletas no tienen nada que aceptar ni
            quedan bloqueados.
          </p>
        </div>

        <DialogTrigger asChild>
          <button className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground active:opacity-90">
            <Upload className="h-4 w-4" /> Subir contrato
          </button>
        </DialogTrigger>

        {isLoading ? (
          <p className="text-center text-xs text-muted-foreground">Cargando…</p>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed p-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <Upload className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold">Sin contratos todavía</h2>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">
              Sube tu primer contrato para que aparezca en la app de tus atletas. Mientras no subas
              nada, tus atletas no ven nada pendiente.
            </p>
            <DialogTrigger asChild>
              <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground active:opacity-90">
                <Upload className="h-4 w-4" /> Subir contrato
              </button>
            </DialogTrigger>
          </div>
        ) : (
          <ul className="space-y-3">
            {contracts.map((c) => (
              <ContractRow key={c.slug} contract={c} accepted={stats?.bySlug.get(c.slug) ?? 0} total={stats?.totalMembers ?? 0} onChange={invalidate} />
            ))}
          </ul>
        )}
      </AdminShell>
      <UploadDialog onDone={() => { setOpen(false); invalidate(); }} />
    </Dialog>
  );
}

function ContractRow({ contract, accepted, total, onChange }: { contract: Contract; accepted: number; total: number; onChange: () => void }) {
  const Icon = iconFor(contract.mime_type);
  const { boxId } = useBox();
  const replaceRef = useRef<HTMLInputElement>(null);
  // Por defecto exige re-aceptar — "Corrección menor" es la excepción
  // explícita, elegida antes de soltar el archivo.
  const [requiresReacceptance, setRequiresReacceptance] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const replaceMut = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Máx ${MAX_MB}MB`);
      const ext = file.name.split(".").pop() ?? "bin";
      // Ruta nueva en cada reemplazo — las versiones anteriores quedan
      // intactas en el storage (inmutables, nunca se borran ni actualizan).
      const path = `${boxId}/${contract.slug}/${randomKey()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("contracts").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      await replaceContractDocument({
        boxId,
        slug: contract.slug,
        title: contract.title,
        objectPath: path,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        requiresReacceptance,
      });
    },
    onSuccess: () => {
      toast.success(
        requiresReacceptance
          ? "Archivo reemplazado. Los atletas deben aceptar de nuevo."
          : "Archivo reemplazado como corrección menor. Nadie queda pendiente.",
      );
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      // El archivo anterior NO se borra del storage (política inmutable) —
      // delete_contract_document solo quita la fila y archiva su versión
      // vigente en el historial.
      await deleteContractDocument(boxId, contract.slug);
    },
    onSuccess: () => { toast.success("Contrato eliminado"); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openFile() {
    if (!contract.object_path) return toast.error("Este documento aún no tiene archivo cargado");
    const { data, error } = await supabase.storage.from("contracts").createSignedUrl(contract.object_path, 60);
    if (error || !data) return toast.error("No se pudo abrir");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  const pct = total > 0 ? Math.round((accepted / total) * 100) : 0;

  return (
    <li className="rounded-3xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{contract.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{contract.doc_type} · {contract.file_name ?? "—"}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Actualizado {new Date(contract.updated_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold">{accepted}/{total} aceptaron</span>
        <div className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-background">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <Label className="text-xs">Al reemplazar este archivo</Label>
        <Select value={requiresReacceptance ? "reaccept" : "minor"} onValueChange={(v) => setRequiresReacceptance(v === "reaccept")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="reaccept">Los alumnos deben aceptar de nuevo</SelectItem>
            <SelectItem value="minor">Corrección menor (no exige aceptar de nuevo)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" className="rounded-xl" onClick={openFile}>
          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ver
        </Button>
        <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => replaceRef.current?.click()} disabled={replaceMut.isPending}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> {replaceMut.isPending ? "…" : "Reemplazar"}
        </Button>
        <Button variant="ghost" size="sm" className="rounded-xl text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Borrar
        </Button>
      </div>
      <input ref={replaceRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceMut.mutate(f); e.target.value = ""; }} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar contrato"
        description="El archivo sigue en el historial, pero deja de mostrarse a los atletas."
        confirmLabel="Eliminar"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => { deleteMut.mutate(); setConfirmDelete(false); }}
      />
    </li>
  );
}

function UploadDialog({ onDone }: { onDone: () => void }) {
  const { boxId } = useBox();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return toast.error("Título requerido");
    if (!file) return toast.error("Selecciona un archivo");
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Máx ${MAX_MB}MB`);
    setBusy(true);
    try {
      const slug = slugify(title);
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${boxId}/${slug}/${randomKey()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("contracts").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      try {
        // Un contrato recién creado no tiene a quién pedirle que vuelva a
        // aceptar — requiresReacceptance=true aquí no resetea nada (no hay
        // lectores previos de este slug en este box), solo documenta la
        // intención por si en el futuro replace_contract_document cambia.
        await replaceContractDocument({
          boxId,
          slug,
          title: title.trim(),
          objectPath: path,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          requiresReacceptance: true,
        });
      } catch (err) {
        await supabase.storage.from("contracts").remove([path]).catch(() => {});
        throw err;
      }

      toast.success("Contrato subido. Se notificará a tus atletas.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="max-w-sm rounded-3xl">
      <DialogHeader><DialogTitle>Subir contrato</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs">Título visible</Label>
          <Input id="title" placeholder="Contrato de Membresía" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="file" className="text-xs">Archivo (PDF, Word, imagen · máx {MAX_MB}MB)</Label>
          <Input id="file" type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={busy} className="w-full rounded-xl">
          {busy ? "Subiendo…" : "Subir"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
