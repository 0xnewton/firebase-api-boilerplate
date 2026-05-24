export type AppStage = "local" | "dev" | "staging" | "prod";

export type AppConfig = {
  stage: AppStage;
  projectId: string;
  storageBucket?: string;
  corsAllowedOrigins: string[];
  functions: {
    minInstances?: number;
    maxInstances?: number;
  };
};

type Env = Record<string, string | undefined>;

export function readAppConfig(env: Env): AppConfig {
  return {
    stage: readStage(env.APP_STAGE),
    projectId: env.GCLOUD_PROJECT ?? env.GCP_PROJECT ?? "local",
    storageBucket: env.STORAGE_BUCKET,
    corsAllowedOrigins: readCsv(env.CORS_ALLOWED_ORIGINS),
    functions: {
      minInstances: readInteger(env.FUNCTION_MIN_INSTANCES, 0),
      maxInstances: readInteger(env.FUNCTION_MAX_INSTANCES, 10),
    },
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

function readInteger(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, received: ${value}`);
  }

  return parsed;
}
