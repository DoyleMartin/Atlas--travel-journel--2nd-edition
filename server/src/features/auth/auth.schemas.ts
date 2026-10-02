import { z } from 'zod';
import { USERNAME_PATTERN } from '../users/user.model.js';

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(USERNAME_PATTERN, 'Username can only contain letters, numbers and underscores'),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    // bcrypt only uses the first 72 bytes
    .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password is too long'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
