// Re-export of the shared, Supabase-generated schema types.
// Source of truth: lib/supabase-types (@workspace/supabase-types).
// Kept as a thin shim so the generated `import { Database } from "./types"`
// call sites in this folder don't need to change.
export * from "@workspace/supabase-types";
