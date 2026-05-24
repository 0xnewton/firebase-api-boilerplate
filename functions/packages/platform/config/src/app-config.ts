export type AppStage = "local" | "dev" | "staging" | "prod";

export type AppConfig = {
  stage: AppStage;
  projectId: string;
  storageBucket?: string;
  corsAllowedOrigins: string[];
};

type Env = Record<string, string | undefined>;

export function readAppConfig(env: Env): AppConfig {
  return {
    stage: readStage(env.APP_STAGE),
    projectId: env.GCLOUD_PROJECT ?? env.GCP_PROJECT ?? "local",
    storageBucket: env.STORAGE_BUCKET,
    corsAllowedOrigins: readCsv(env.CORS_ALLOWED_ORIGINS),
  };
}

function readStage(value: string | undefined): AppStage {
  if (
    value === "dev" ||
    value === "staging" ||
    value === "prod" ||
    value === "local"
  ) {
    return value;
  }

  return "local";
}

function readCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
