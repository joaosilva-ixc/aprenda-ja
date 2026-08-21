import { z } from "zod";

export const emailSchema = z
  .email("E-mail inválido")
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo");

export const passwordSchema = z
  .string()
  .min(6, "A senha deve ter pelo menos 6 caracteres")
  .max(128, "A senha deve ter no máximo 128 caracteres");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha").max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual").max(128),
  newPassword: passwordSchema,
});

export const nameSchema = z
  .string()
  .trim()
  .min(1, "O nome não pode ficar vazio")
  .max(120, "Nome muito longo");

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: z.enum(["MASTER", "ADMIN", "ALUNO"]).default("ALUNO"),
});

export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    role: z.enum(["MASTER", "ADMIN", "ALUNO"]).optional(),
    password: passwordSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nada para atualizar",
  });

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: "Nada para atualizar",
  });

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use o formato #rrggbb)");

export const iconSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{1,40}$/, "Ícone inválido");

export const createThemeSchema = z.object({
  name: nameSchema.max(80, "Nome do tema muito longo"),
  color: hexColorSchema.default("#2563eb"),
  icon: iconSchema.default("book-open"),
});

export const updateThemeSchema = z
  .object({
    name: nameSchema.max(80, "Nome do tema muito longo").optional(),
    color: hexColorSchema.optional(),
    icon: iconSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nada para atualizar",
  });

export const createAnnouncementSchema = z.object({
  title: z.string().trim().max(200, "Título muito longo").optional().nullable(),
  message: z
    .string()
    .trim()
    .min(1, "A mensagem do aviso é obrigatória")
    .max(1200, "A mensagem do aviso deve ter no máximo 1200 caracteres"),
  type: z.enum(["AVISO", "COMUNICADO", "NOVIDADE"]).default("AVISO"),
});

export const updateAulaSchema = z
  .object({
    title: z.string().trim().min(1, "O título não pode ficar vazio").max(200, "Título muito longo").optional(),
    description: z.string().trim().max(5000, "Descrição muito longa").optional(),
    themeId: z.string().min(1).max(64).optional(),
    tags: z.string().max(500, "Tags muito longas").optional(),
    status: z.enum(["UPLOADING", "READY", "SYNCING", "SYNCED", "FAILED"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nada para atualizar",
  });

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Dados inválidos" };
  }
  return { ok: true, data: result.data };
}
