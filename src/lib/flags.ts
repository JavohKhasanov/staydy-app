// Feature flags. Leads UI is hidden until the amoCRM integration ships — the backend and
// /leads routes still work, only the surfaces (nav, search, dashboard, reports) are gated.
export const LEADS_ENABLED = false;

// Integratsiya (CSV import + webhook) hidden for the no-CRM starter audience; flip when needed.
export const INTEGRATIONS_ENABLED = false;
