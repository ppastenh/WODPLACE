import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth } from "../supabase";

export default defineTool({
  name: "finance_summary",
  title: "Resumen financiero",
  description:
    "Resumen de ingresos de un mes: total cobrado, pagos pendientes y detalle de los últimos pagos registrados.",
  inputSchema: {
    month: z.string().optional().describe("Mes en formato YYYY-MM (por defecto el mes actual)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ month }, ctx) => {
    const supabase = requireAuth(ctx);
    const ref = month ?? new Date().toISOString().slice(0, 7);
    const start = `${ref}-01`;
    const [y, m] = ref.split("-").map(Number);
    const endDate = new Date(Date.UTC(y!, m!, 1));
    const end = endDate.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("payments")
      .select("id, amount, status, method, paid_at, due_date, members(full_name)")
      .or(`and(paid_at.gte.${start},paid_at.lt.${end}),status.eq.pendiente`)
      .order("paid_at", { ascending: false })
      .limit(100);
    if (error) throw new ToolError(error.message);

    const rows = data ?? [];
    const paid = rows.filter((r) => r.status === "pagado" && r.paid_at);
    const pending = rows.filter((r) => r.status === "pendiente");
    const payload = {
      month: ref,
      revenue: paid.reduce((s, r) => s + Number(r.amount ?? 0), 0),
      paid_count: paid.length,
      pending_total: pending.reduce((s, r) => s + Number(r.amount ?? 0), 0),
      pending_count: pending.length,
      recent_payments: rows.slice(0, 20),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
