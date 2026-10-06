export * from "./generated/api";
export * from "./generated/types";

// DeletePr(Goal) now takes both a path param (id) and a query param
// (userId, added for the Fase 4 ownership fix — see rm.ts). orval's zod
// output correctly splits these into DeletePrParams (path: {id}) and
// DeletePrQueryParams (query: {userId}), but its plain-TS-type output
// (generated/types/) names the query-only type "DeletePrParams" too
// (dropping the "Query" qualifier) — colliding with api.ts's path-only
// schema of the same name. Explicit re-export picks api.ts's version (the
// one every consumer actually imports/uses) and resolves the otherwise-
// ambiguous `export *` above; regenerate-safe since this file itself is
// hand-maintained, not part of the generated output.
export { DeletePrParams, DeletePrGoalParams } from "./generated/api";
export * from './generated/api';
export * from './generated/types';
