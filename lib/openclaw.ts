import { getOpenClawEnv } from "@/lib/env";

export async function callOpenClaw<T>(task: string, payload: Record<string, unknown>) {
  const env = getOpenClawEnv();
  const res = await fetch(`${env.openClawBaseUrl.replace(/\/$/, "")}/tasks/${task}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openClawApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw call failed (${task}): ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}
