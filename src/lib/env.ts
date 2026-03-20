import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  console.error("❌ Invalid environment variables", fieldErrors);
  throw new Error(`Invalid environment variables: ${JSON.stringify(fieldErrors)}`);
}

export const env = parsed.data;
