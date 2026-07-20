// Feature flags. Leads UI is hidden until the amoCRM integration ships — the backend and
// /leads routes still work, only the surfaces (nav, search, dashboard, reports) are gated.
export const LEADS_ENABLED = false;

// Integratsiya (CSV import + webhook) hidden for the no-CRM starter audience; flip when needed.
export const INTEGRATIONS_ENABLED = false;

// Aloqa tarixi (contact log) hidden until SMS/comms ship.
export const CONTACT_LOG_ENABLED = false;
// Mentor + student-code fields hidden for the no-CRM starter audience.
export const MENTOR_ENABLED = false;

// Per-student course enrollments hidden — the course now comes from the group; billing runs
// through invoices/group payments. Re-enable if per-course enrollment pricing returns.
export const ENROLLMENTS_ENABLED = false;
