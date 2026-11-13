import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

/** Validates and normalizes process environment configuration. */
export function parseEnv(rawEnv: Record<string, string | undefined>): AppEnv {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => ${issue.path.join(".")}: )
      .join("; ");
    throw new Error(Invalid environment configuration: );
  }
  return parsed.data;
}

export function getEnv(): AppEnv {
  return parseEnv(process.env);
}