import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BoxOption = { id: string; name: string };

type BoxContextValue = {
  /** Currently active box id — every admin query/insert is scoped to this. */
  boxId: string;
  boxName: string;
  /** Boxes the signed-in user can act on (all boxes for super_admin). */
  boxes: BoxOption[];
  isSuperAdmin: boolean;
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
  children,
}: {
  boxes: BoxOption[];
  isSuperAdmin: boolean;
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

  const value = useMemo<BoxContextValue>(
    () => ({
      boxId,
      boxName: boxes.find((b) => b.id === boxId)?.name ?? "",
      boxes,
      isSuperAdmin,
      setBoxId,
    }),
    [boxId, boxes, isSuperAdmin, setBoxId],
  );

  return <BoxContext.Provider value={value}>{children}</BoxContext.Provider>;
}

export function useBox(): BoxContextValue {
  const ctx = useContext(BoxContext);
  if (!ctx) throw new Error("useBox must be used within <BoxProvider>");
  return ctx;
}
