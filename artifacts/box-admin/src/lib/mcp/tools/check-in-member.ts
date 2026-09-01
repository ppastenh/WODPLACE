import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth } from "../supabase";

export default defineTool({
  name: "check_in_member",
  title: "Registrar asistencia",
  description: "Registra el check-in (asistencia) de un miembro en el box, con la fecha y hora actual.",
  inputSchema: {
    member_id: z.string().describe("UUID del miembro (usar list_members)"),
    notes: z.string().optional().describe("Nota opcional del check-in"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ member_id, notes }, ctx) => {
    const supabase = requireAuth(ctx);
    const { data, error } = await supabase
      .from("attendance")
      .insert({ member_id, ...(notes ? { notes } : {}) })
      .select("id, member_id, checked_in_at, notes")
      .single();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `Check-in registrado: ${JSON.stringify(data)}` }],
      structuredContent: { attendance: data },
    };
  },
});
