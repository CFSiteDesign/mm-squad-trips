// The admin "Guest journeys" tab imports the real email templates from
// supabase/functions/_shared (Deno edge code) to preview them. Those files only
// touch Deno inside functions the browser never calls; this keeps tsc happy.
declare const Deno: { env: { get(key: string): string | undefined } };
