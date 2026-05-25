// Shared Airtable client through the Lovable connector gateway.
// Inlined in each edge function (Deno edge functions don't easily share imports).
const GATEWAY = "https://connector-gateway.lovable.dev/airtable";

export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  createdTime?: string;
  fields: T;
}

export function airtableEnv() {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const airtableKey = Deno.env.get("AIRTABLE_API_KEY");
  const baseId = Deno.env.get("AIRTABLE_BASE_ID");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!airtableKey) throw new Error("AIRTABLE_API_KEY is not configured");
  if (!baseId) throw new Error("AIRTABLE_BASE_ID is not configured");
  return { lovableKey, airtableKey, baseId };
}

export async function airtableGet<T = Record<string, unknown>>(
  table: string,
  params: Record<string, string> = {},
): Promise<AirtableRecord<T>[]> {
  const { lovableKey, airtableKey, baseId } = airtableEnv();
  const qs = new URLSearchParams(params).toString();
  const url = `${GATEWAY}/v0/${baseId}/${encodeURIComponent(table)}${qs ? `?${qs}` : ""}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": airtableKey,
    },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Airtable GET ${table} [${r.status}]: ${JSON.stringify(data)}`);
  return data.records as AirtableRecord<T>[];
}

export async function airtableCreate<T = Record<string, unknown>>(
  table: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord<T>> {
  const { lovableKey, airtableKey, baseId } = airtableEnv();
  const url = `${GATEWAY}/v0/${baseId}/${encodeURIComponent(table)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": airtableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Airtable CREATE ${table} [${r.status}]: ${JSON.stringify(data)}`);
  return data as AirtableRecord<T>;
}
