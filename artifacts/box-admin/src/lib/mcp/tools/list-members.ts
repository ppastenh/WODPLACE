import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth } from "../supabase";

export default defineTool({
  name: "list_members",
  title: "Listar miembros",
  description:
    "Lista los miembros del box, con búsqueda opcional por nombre/email y filtro por estado (activo, suspendido, vencido, pausado, bloqueado).",
  inputSchema: {
    search: z.string().optional().describe("Texto a buscar en nombre o email"),
    status: z.string().optional().describe("Estado exacto: activo | suspendido | vencido | pausado | bloqueado"),
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de resultados (por defecto 25)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, status, limit }, ctx) => {
    const supabase = requireAuth(ctx);
    let query = supabase
      .from("members")
      .select("id, full_name, email, phone, status, plan_id, join_date, next_payment")
      .order("full_name")
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status as never);
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { members: data ?? [] },
    };
  },
});
