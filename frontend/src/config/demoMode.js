/**
 * Demonstration accounts (well-known emails and passwords, self-provisioned on
 * first login) are a development convenience only. They are enabled for local
 * dev servers and must be opted into explicitly for a deployed build via
 * VITE_ENABLE_DEMO_ACCOUNTS=true.
 */
export const DEMO_MODE_ENABLED =
  import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true' || import.meta.env.DEV === true;
