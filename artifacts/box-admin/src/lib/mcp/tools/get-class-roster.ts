import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth } from "../supabase";

export default defineTool({
  name: "get_class_roster",
  title: "Inscritos de una clase",
  description: "Devuelve la información de una clase y la lista de inscritos, asistentes y lista de espera.",
  inputSchema: {
    class_id: z.string().describe("UUID de la clase (usar list_classes)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ class_id }, ctx) => {
    const supabase = requireAuth(ctx);
    const { data: klass, error } = await supabase
      .from("classes")
      .select("id, name, class_date, start_time, duration_minutes, capacity, level, status, coaches(full_name)")
      .eq("id", class_id)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!klass) throw new ToolError("Clase no encontrada");

    const { data: roster, error: rosterError } = await supabase
      .from("class_attendees")
      .select("id, status, members(id, full_name, email)")
      .eq("class_id", class_id);
    if (rosterError) throw new ToolError(rosterError.message);

    const payload = { class: klass, roster: roster ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
