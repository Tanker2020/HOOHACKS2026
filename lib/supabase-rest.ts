import { getSupabaseEnv } from "@/lib/env";

function baseHeaders() {
  const env = getSupabaseEnv();
  return {
    apikey: env.supabaseServiceRoleKey,
    Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function buildUrl(path: string, params?: Record<string, string>) {
  const env = getSupabaseEnv();
  const url = new URL(`/rest/v1/${path}`, env.supabaseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase request failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as T;
  return json;
}

export async function selectRows<T>(
  table: string,
  params?: Record<string, string>,
): Promise<T[]> {
  const res = await fetch(buildUrl(table, params), {
    headers: {
      ...baseHeaders(),
      Prefer: "count=exact",
    },
    cache: "no-store",
  });

  return handle<T[]>(res);
}

export async function insertRows<T>(
  table: string,
  rows: Record<string, unknown>[],
): Promise<T[]> {
  const res = await fetch(buildUrl(table), {
    method: "POST",
    headers: {
      ...baseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });

  return handle<T[]>(res);
}

export async function updateRows<T>(
  table: string,
  match: Record<string, string>,
  patch: Record<string, unknown>,
): Promise<T[]> {
  const params: Record<string, string> = {};
  Object.entries(match).forEach(([k, v]) => {
    params[k] = `eq.${v}`;
  });

  const res = await fetch(buildUrl(table, params), {
    method: "PATCH",
    headers: {
      ...baseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });

  return handle<T[]>(res);
}
