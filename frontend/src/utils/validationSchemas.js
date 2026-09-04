// src/utils/validationSchemas.js
import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({ password: z.string().min(8, 'Password must be at least 8 characters'), confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().optional().or(z.literal('')),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().or(z.literal('')),
  category: z.string().max(60).optional().or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional().or(z.literal('')),
});

export const reminderSchema = z
  .object({
    channel: z.enum(['email', 'sms', 'both']),
    scheduleMode: z.enum(['offset', 'absolute']),
    offsetAmount: z.coerce.number().int().min(1).optional(),
    offsetUnit: z.enum(['minutes', 'hours', 'days', 'weeks']).optional(),
    scheduledTime: z.string().optional().or(z.literal('')),
    repeatType: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']),
    repeatInterval: z.coerce.number().int().min(1).optional(),
    daysOfWeek: z.array(z.number()).optional(),
    endDate: z.string().optional().or(z.literal('')),
    message: z.string().max(500).optional().or(z.literal('')),
  })
  .refine((data) => data.scheduleMode !== 'offset' || (data.offsetAmount && data.offsetUnit), {
    message: 'Enter how long before the due date to send this reminder',
    path: ['offsetAmount'],
  })
  .refine((data) => data.scheduleMode !== 'absolute' || !!data.scheduledTime, { message: 'Pick a date and time', path: ['scheduledTime'] })
  .refine((data) => data.repeatType !== 'custom' || !!data.repeatInterval, { message: 'Enter a repeat interval in days', path: ['repeatInterval'] });
