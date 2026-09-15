import { z } from "zod";
import { emailSchema, nameSchema, passwordSchema, uuidSchema } from "./common";

export const registerSchema = z.object({
  first_name: nameSchema,
  last_name: z.string().trim().max(100).optional().or(z.literal("")),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Invalid reset token").max(200),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, "Invalid verification token").max(200),
});

export const profileSchema = z.object({
  first_name: nameSchema.optional(),
  last_name: z.string().trim().max(100).nullable().optional(),
  avatar: z.string().trim().url("Avatar must be a valid URL").max(500).nullable().optional(),
});

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, "Current password is required").max(128),
  new_password: passwordSchema,
});

export const organizationRenameSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const idParamSchema = z.object({ id: uuidSchema });
