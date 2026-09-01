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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, FileImage, FileType2, Upload, RefreshCw, Trash2, Plus, ExternalLink, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/more/files")({
  head: () => ({
    meta: [
      { title: "Archivos — Dlovebox" },
      { name: "description", content: "Contratos y documentos generales para los atletas." },
      { property: "og:title", content: "Archivos — Dlovebox" },
      { property: "og:description", content: "Sube y gestiona contratos que ven los atletas." },
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
    .replace(/[\u0300-\u036f]/g, "")
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

function FilesPage() {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const { data: contracts = [], isLoading } = useQuery({ queryKey: ["contracts", boxId], queryFn: () => fetchContracts(boxId) });
  const { data: stats } = useQuery({ queryKey: ["contract-stats", boxId], queryFn: () => fetchStats(boxId) });
  const [open, setOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["contract-stats"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <AdminShell title="Archivos" showBack right={
        <DialogTrigger asChild>
          <button aria-label="Subir archivo" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
          </button>
        </DialogTrigger>
      }>
        <div className="mb-4 rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Contratos generales</p>
          <p className="mt-1 text-sm">Los archivos aquí se muestran a todos los atletas en <span className="font-semibold">Contratos Activos</span>. Al reemplazar un archivo, se resetea la aceptación y se bloquea el agendamiento hasta que lo acepten.</p>
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
            <h2 className="mt-4 text-lg font-bold">Sin archivos</h2>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">Sube tu primer contrato para que aparezca en la app de los atletas.</p>
            <DialogTrigger asChild>
              <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground active:opacity-90">
                <Upload className="h-4 w-4" /> Subir archivo
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

  const replaceMut = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Máx ${MAX_MB}MB`);
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${boxId}/${contract.slug}/${randomKey()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("contracts").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("contract_documents").update({
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        object_path: path,
        updated_at: new Date().toISOString(),
      }).eq("box_id", boxId).eq("slug", contract.slug);
      if (dbErr) throw dbErr;
      if (contract.object_path) {
        await supabase.storage.from("contracts").remove([contract.object_path]).catch(() => {});
      }
    },
    onSuccess: () => { toast.success("Archivo reemplazado. Los atletas deben aceptar de nuevo."); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (contract.object_path) {
        await supabase.storage.from("contracts").remove([contract.object_path]).catch(() => {});
      }
      const { error } = await supabase.from("contract_documents").delete().eq("box_id", boxId).eq("slug", contract.slug);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Archivo eliminado"); onChange(); },
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

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" className="rounded-xl" onClick={openFile}>
          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ver
        </Button>
        <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => replaceRef.current?.click()} disabled={replaceMut.isPending}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> {replaceMut.isPending ? "…" : "Reemplazar"}
        </Button>
        <Button variant="ghost" size="sm" className="rounded-xl text-destructive" onClick={() => { if (confirm("¿Eliminar este archivo?")) deleteMut.mutate(); }}>
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Borrar
        </Button>
      </div>
      <input ref={replaceRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceMut.mutate(f); e.target.value = ""; }} />
    </li>
  );
}

function UploadDialog({ onDone }: { onDone: () => void }) {
  const { boxId } = useBox();
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("Contrato");
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

      const { error: dbErr } = await supabase.from("contract_documents").upsert({
        box_id: boxId,
        slug,
        title: title.trim(),
        doc_type: docType,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        object_path: path,
        updated_at: new Date().toISOString(),
      }, { onConflict: "box_id,slug" });
      if (dbErr) {
        await supabase.storage.from("contracts").remove([path]).catch(() => {});
        throw dbErr;
      }

      toast.success("Archivo subido. Se notificará a los atletas.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="max-w-sm rounded-3xl">
      <DialogHeader><DialogTitle>Subir archivo</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs">Título visible</Label>
          <Input id="title" placeholder="Contrato de Membresía" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Contrato">Contrato</SelectItem>
              <SelectItem value="Reglamento">Reglamento</SelectItem>
              <SelectItem value="Aviso">Aviso</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
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
