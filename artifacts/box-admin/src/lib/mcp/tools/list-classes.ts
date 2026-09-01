import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth } from "../supabase";

export default defineTool({
  name: "list_classes",
  title: "Listar clases",
  description:
    "Lista las clases (WODs) programadas en un rango de fechas, con coach, hora, duración, cupos y número de inscritos.",
  inputSchema: {
    from: z.string().optional().describe("Fecha inicial YYYY-MM-DD (por defecto hoy)"),
    to: z.string().optional().describe("Fecha final YYYY-MM-DD (por defecto igual a 'from')"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    const supabase = requireAuth(ctx);
    const start = from ?? new Date().toISOString().slice(0, 10);
    const end = to ?? start;
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, class_date, start_time, duration_minutes, capacity, level, status, coaches(full_name), class_attendees(id, status)")
      .gte("class_date", start)
      .lte("class_date", end)
      .order("class_date")
      .order("start_time");
    if (error) throw new ToolError(error.message);

    const classes = (data ?? []).map((row) => {
      const c = row as unknown as Record<string, unknown> & {
        class_attendees?: Array<{ status: string }>;
        coaches?: { full_name: string } | Array<{ full_name: string }> | null;
      };
      const attendees = c.class_attendees ?? [];
      const { class_attendees: _omit, coaches, ...rest } = c;
      const coach = Array.isArray(coaches) ? (coaches[0]?.full_name ?? null) : (coaches?.full_name ?? null);
      return {
        ...rest,
        coach,
        enrolled: attendees.filter((a) => a.status !== "lista_espera").length,
        attended: attendees.filter((a) => a.status === "asistio").length,
        waitlist: attendees.filter((a) => a.status === "lista_espera").length,
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(classes) }],
      structuredContent: { classes },
    };
  },
});
