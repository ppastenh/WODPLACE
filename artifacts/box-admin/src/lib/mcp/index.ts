import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMembers from "./tools/list-members";
import getMember from "./tools/get-member";
import listClasses from "./tools/list-classes";
import getClassRoster from "./tools/get-class-roster";
import financeSummary from "./tools/finance-summary";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "crossfit-hub",
  title: "CrossFit Hub",
  version: "0.1.0",
  instructions:
    "Herramientas del panel de administración del box (Dlovebox). Consulta miembros, clases del día, inscritos y resumen financiero. Los datos se leen como el usuario autenticado, respetando sus permisos.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMembers, getMember, listClasses, getClassRoster, financeSummary],
});
