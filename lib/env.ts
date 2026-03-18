import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  ADMIN_SESSION_SECRET: z.string().min(32),
  VOTING_TOKEN_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_ADMIN_NAME: z.string().min(1).optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).optional(),
  BOOTSTRAP_ADMIN_NAME: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
