import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBox } from "@/lib/box-context";
import { Avatar } from "./members";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * The athlete-facing "simple" profile — built to look and feel like the
 * mobile app's own Perfil screen (app/profile.tsx / app/member/[id].tsx in
 * wodplace): avatar, name, phrase, rank badge, and Publicaciones/PRs tabs.
 * Deliberately excludes status/plan/payments/notes — those stay in the
 * full admin screen at /members/$id ("Gestionar membresía").
 *
 * Two separate codebases (this is a web app, the mobile screen is React
 * Native) so this is its own implementation querying Supabase directly,
 * not a call into the mobile app.
 */
export const Route = createFileRoute("/_authenticated/_admin/member-profile/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Perfil — Dlovebox` },
      { name: "description", content: `Perfil de ${params.id}.` },
    ],
  }),
  component: MemberSimpleProfile,
});

type ProfileRow = {
  user_id: string;
  joined_at: string | null;
  wodplace_users: { name: string; avatar_url: string | null; rank: string | null; phrase: string | null } | null;
};

type PrRow = {
  id: string;
  lift_name: string;
  weight: number;
  unit: string;
  achieved_at: string;
};

type PostRow = {
  id: string;
  body: string;
  image_uris: string | null;
  created_at: string;
};

function MemberSimpleProfile() {
  const { id } = Route.useParams();
  const { boxId } = useBox();

  const profile = useQuery({
    queryKey: ["member-simple-profile", boxId, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("box_members")
        .select("user_id, joined_at, wodplace_users(name, avatar_url, rank, phrase)")
        .eq("box_id", boxId)
        .eq("user_id", id)
        .maybeSingle();
      return (data as unknown as ProfileRow | null) ?? null;
    },
  });

  const prs = useQuery({
    queryKey: ["member-simple-prs", id],
    queryFn: async () =>
      ((await supabase.from("prs").select("id, lift_name, weight, unit, achieved_at").eq("user_id", id).order("achieved_at", { ascending: false })).data ??
        []) as PrRow[],
  });

  const posts = useQuery({
    queryKey: ["member-simple-posts", id],
    queryFn: async () =>
      ((await supabase
        .from("social_posts")
        .select("id, body, image_uris, created_at")
        .eq("user_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20)).data ?? []) as PostRow[],
  });

  const p = profile.data;
  if (!p) {
    return (
      <AdminShell title="Perfil" showBack>
        <p className="p-6 text-center text-sm text-muted-foreground">
          {profile.isLoading ? "Cargando..." : "No encontrado"}
        </p>
      </AdminShell>
    );
  }

  const wu = p.wodplace_users;
  const fullName = wu?.name ?? "—";
  const memberSince = p.joined_at ? format(new Date(p.joined_at), "MMMM yyyy", { locale: es }) : null;

  return (
    <AdminShell title="Perfil" showBack>
      <div className="flex flex-col items-center rounded-3xl border bg-card p-5 text-center">
        <Avatar name={fullName} url={wu?.avatar_url} size={80} />
        <h1 className="mt-3 text-xl font-black">{fullName}</h1>
        {wu?.phrase && <p className="mt-1 text-sm italic text-muted-foreground">"{wu.phrase}"</p>}
        {memberSince && <p className="mt-1 text-xs text-muted-foreground">Miembro desde {memberSince}</p>}
        {wu?.rank && (
          <span className="mt-3 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
            {wu.rank}
          </span>
        )}
      </div>

      <Tabs defaultValue="posts" className="mt-5">
        <TabsList className="grid w-full grid-cols-2 rounded-full bg-secondary">
          <TabsTrigger value="posts" className="rounded-full text-xs">Publicaciones</TabsTrigger>
          <TabsTrigger value="prs" className="rounded-full text-xs">PRs</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-2">
          {posts.data?.length === 0 && <Empty text="Todavía no publicó nada en Comunidad" />}
          {posts.data?.map((post) => {
            const images = post.image_uris ? (JSON.parse(post.image_uris) as string[]) : [];
            return (
              <div key={post.id} className="rounded-2xl border bg-card p-3">
                {post.body && <p className="text-sm">{post.body}</p>}
                {images.length > 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {images.length} foto{images.length > 1 ? "s" : ""}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">{format(new Date(post.created_at), "dd MMM yyyy")}</p>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="prs" className="mt-4 space-y-2">
          {prs.data?.length === 0 && <Empty text="Todavía no tiene PRs registrados" />}
          {prs.data?.map((pr) => (
            <div key={pr.id} className="flex items-center justify-between rounded-2xl border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{pr.lift_name}</p>
                <p className="text-[11px] text-muted-foreground">{format(new Date(pr.achieved_at), "dd MMM yyyy")}</p>
              </div>
              <p className="text-lg font-black text-primary">
                {pr.weight}
                <span className="text-xs text-muted-foreground">{pr.unit}</span>
              </p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed p-5 text-center text-xs text-muted-foreground">{text}</div>;
}
