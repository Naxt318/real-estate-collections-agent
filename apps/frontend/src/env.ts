import { z } from 'zod';

// Server-only configuration. Not prefixed with NEXT_PUBLIC_, so Next.js never
// inlines these values into the browser bundle.
const envSchema = z.object({
  API_BASE_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid frontend environment variables:\n${problems}`);
  }
  return result.data;
}

export const env = parseEnv();
