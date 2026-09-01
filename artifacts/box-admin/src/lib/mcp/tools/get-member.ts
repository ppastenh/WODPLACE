import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth } from "../supabase";

export default defineTool({
  name: "get_member",
  title: "Detalle de miembro",
  description:
    "Devuelve la ficha completa de un miembro: datos personales, plan, últimos pagos, últimas asistencias y PRs.",
  inputSchema: {
    member_id: z.string().describe("UUID del miembro (usar list_members para obtenerlo)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ member_id }, ctx) => {
    const supabase = requireAuth(ctx);
    const { data: member, error } = await supabase
      .from("members")
      .select("*, plans(name, price, duration_days)")
      .eq("id", member_id)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!member) throw new ToolError("Miembro no encontrado");

    const [payments, attendance, prs] = await Promise.all([
      supabase.from("payments").select("id, amount, method, status, paid_at, due_date")
        .eq("member_id", member_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("attendance").select("id, checked_in_at")
        .eq("member_id", member_id).order("checked_in_at", { ascending: false }).limit(10),
      supabase.from("prs").select("id, lift_name, weight, unit, achieved_at")
        .eq("member_id", member_id).order("achieved_at", { ascending: false }).limit(20),
    ]);

    const payload = {
      member,
      payments: payments.data ?? [],
      attendance: attendance.data ?? [],
      prs: prs.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
