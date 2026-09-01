import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Megaphone, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useBox } from "@/lib/box-context";
import {
  fetchAnnouncements,
  fetchMyReads,
  markRead,
  formatDate,
  signedImageUrl,
  type Announcement,
} from "@/lib/announcements";

export function NotificationsBell() {
  const qc = useQueryClient();
  const { boxId } = useBox();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Announcement | null>(null);

  const { data: items = [] } = useQuery({ queryKey: ["announcements", boxId], queryFn: () => fetchAnnouncements(boxId) });
  const { data: reads } = useQuery({ queryKey: ["announcement-reads", boxId], queryFn: () => fetchMyReads(boxId) });

  const unread = items.filter((a) => !reads?.has(a.id)).length;

  async function openDetail(a: Announcement) {
    setDetail(a);
    if (!reads?.has(a.id)) {
      await markRead(a.id, boxId);
      qc.invalidateQueries({ queryKey: ["announcement-reads", boxId] });
    }
  }

  return (
    <>
      <button
        aria-label="Avisos"
        onClick={() => setOpen(true)}
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground active:opacity-80"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        )}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">Avisos</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[65vh] space-y-2 overflow-y-auto px-4 pb-8">
            {items.length === 0 && (
              <p className="py-10 text-center text-xs text-muted-foreground">No hay avisos por ahora.</p>
            )}
            {items.map((a) => {
              const isUnread = !reads?.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => openDetail(a)}
                  className="flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left active:bg-secondary/60"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    {a.body && <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{formatDate(a.created_at)}</p>
                  </div>
                  {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-destructive" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="flex flex-row items-start gap-3 pb-2">
            <DrawerTitle className="flex-1 text-base">{detail?.title}</DrawerTitle>
            <button aria-label="Cerrar" onClick={() => setDetail(null)} className="grid h-8 w-8 place-items-center rounded-full bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-8">
            {detail && <AnnouncementImage path={detail.image_url} />}
            {detail?.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{detail.body}</p>}
            {detail && <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{formatDate(detail.created_at)}</p>}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export function AnnouncementImage({ path }: { path: string | null }) {
  const { data: url } = useQuery({
    queryKey: ["announcement-image", path],
    queryFn: () => signedImageUrl(path),
    enabled: !!path,
  });
  if (!url) return null;
  return <img src={url} alt="Imagen del aviso" loading="lazy" className="w-full rounded-2xl object-cover" />;
}
