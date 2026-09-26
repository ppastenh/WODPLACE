import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BoxOption = { id: string; name: string; photo_url: string | null };
export type RoleRow = { role: string; box_id: string | null };
export type Permissions = Record<string, boolean>;

type BoxContextValue = {
  /** Currently active box id — every admin query/insert is scoped to this. */
  boxId: string;
  boxName: string;
  /** Public URL of the active box's uploaded photo (more/settings.tsx),
   *  null if it never set one — MobileHeader falls back to the dumbbell
   *  icon in that case. */
  boxPhotoUrl: string | null;
  /** Boxes the signed-in user can act on (all boxes for super_admin). */
  boxes: BoxOption[];
  isSuperAdmin: boolean;
  /**
   * True for a real admin (super_admin, or box_admin on the currently active
   * box) — false for a coach. Coaches get the same box-admin screens, but
   * some features (the admin notification bell) are admin-only.
   */
  isAdmin: boolean;
  /**
   * The logged-in staff member's OWN `coaches.permissions` for the active
   * box — null for an admin (unrestricted by design, nothing to check) or
   * while it's still loading/unresolved. A coach's own row, not any other
   * coach's — see more/coaches.tsx's PermissionsDialog for viewing/editing
   * ANOTHER coach's permissions, a different concern.
   */
  myPermissions: Permissions | null;
  setBoxId: (id: string) => void;
};

const BoxContext = createContext<BoxContextValue | null>(null);
const STORAGE_KEY = "dlovebox.activeBoxId";

function readStored(): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

export function BoxProvider({
  boxes,
  isSuperAdmin,
  roles,
  children,
}: {
  boxes: BoxOption[];
  isSuperAdmin: boolean;
  roles: RoleRow[];
  children: ReactNode;
}) {
  const [boxId, setBoxIdState] = useState<string>(() => {
    const stored = readStored();
    if (stored && boxes.some((b) => b.id === stored)) return stored;
    return boxes[0]?.id ?? "";
  });

  // Keep the active box valid if the accessible list changes.
  useEffect(() => {
    if (boxes.length > 0 && !boxes.some((b) => b.id === boxId)) {
      setBoxIdState(boxes[0].id);
    }
  }, [boxes, boxId]);

  const setBoxId = useCallback((id: string) => {
    setBoxIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const isAdmin =
    isSuperAdmin || roles.some((r) => r.role === "box_admin" && r.box_id === boxId);

  // Same query key more/settings.tsx invalidates after an upload/removal —
  // that's what makes this reactive instead of frozen at the initial
  // `_authenticated_admin.tsx` loader value (which only ever runs once per
  // panel session). `initialData` seeds it from that loader's list so the
  // header has something to show before this first fetch resolves.
  const photoQuery = useQuery({
    queryKey: ["box-photo", boxId],
    queryFn: async () => {
      const { data, error } = await supabase.from("boxes").select("photo_url").eq("id", boxId).single();
      if (error) throw error;
      return data.photo_url as string | null;
    },
    enabled: !!boxId,
    initialData: () => boxes.find((b) => b.id === boxId)?.photo_url ?? null,
  });

  // Only meaningful for a coach — an admin's access isn't gated by this
  // column at all, so skip the fetch entirely rather than resolve it to
  // something unused.
  const myPermissionsQuery = useQuery({
    queryKey: ["my-coach-permissions", boxId],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("coaches")
        .select("permissions")
        .eq("box_id", boxId)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      return (data?.permissions as Permissions | undefined) ?? null;
    },
    enabled: !!boxId && !isAdmin,
  });

  const value = useMemo<BoxContextValue>(
    () => ({
      boxId,
      boxName: boxes.find((b) => b.id === boxId)?.name ?? "",
      boxPhotoUrl: photoQuery.data ?? null,
      boxes,
      isSuperAdmin,
      isAdmin,
      myPermissions: isAdmin ? null : (myPermissionsQuery.data ?? null),
      setBoxId,
    }),
    [boxId, boxes, isSuperAdmin, isAdmin, setBoxId, photoQuery.data, myPermissionsQuery.data],
  );

  return <BoxContext.Provider value={value}>{children}</BoxContext.Provider>;
}

export function useBox(): BoxContextValue {
  const ctx = useContext(BoxContext);
  if (!ctx) throw new Error("useBox must be used within <BoxProvider>");
  return ctx;
}
