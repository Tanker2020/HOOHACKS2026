function requireEnv(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getSupabaseEnv() {
  return {
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getOpenClawEnv() {
  return {
    openClawBaseUrl: requireEnv("OPENCLAW_BASE_URL"),
    openClawApiKey: requireEnv("OPENCLAW_API_KEY"),
  };
}

export function getStorageEnv() {
  return {
    workspacesRoot: process.env.WORKSPACES_ROOT ?? "/hoohacks_files/data_files",
    filestashBaseUrl: process.env.FILESTASH_BASE_URL ?? "",
  };
}
