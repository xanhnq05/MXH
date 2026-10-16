import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  country: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  school: z.string().max(120).optional(),
  workplace: z.string().max(120).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Username chỉ gồm chữ thường, số và _")
    .optional(),
});

export const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  soundEnabled: z.boolean().optional(),
  soundTheme: z.enum(["default", "bell", "chime"]).optional(),
});

export const setE2EEKeysSchema = z.object({
  publicKey: z.string().optional(),
  ecdhPublicKey: z.string().optional(),
});

export const searchUserSchema = z.object({
  q: z.string().min(2).max(60),
});
