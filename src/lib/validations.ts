import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
});

export const surveySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  formStyle: z.enum(["NOTION", "TYPEFORM", "CLASSIC"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export const questionSchema = z.object({
  type: z.enum(["SHORT_TEXT", "LONG_TEXT", "MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN", "RATING_SCALE", "FILE_UPLOAD", "YES_NO"]),
  title: z.string().min(1, "Question title is required"),
  description: z.string().optional(),
  required: z.boolean().default(false),
  order: z.number(),
  options: z.string().optional(),
  conditionalLogic: z.string().optional(),
});

export const caseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  isAnonymous: z.boolean().default(true),
  reporterName: z.string().optional(),
  reporterEmail: z.string().email().optional(),
});

export const brandingSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  companyName: z.string().optional(),
  logoUrl: z.string().optional(),
  theme: z.enum(["light", "dark"]).default("light"),
});

export const smtpSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z.coerce.number(),
  user: z.string().min(1, "SMTP user is required"),
  password: z.string().min(1, "SMTP password is required"),
  from: z.string().email("Invalid from email"),
});

export const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  roleId: z.string().min(1, "Role is required"),
});
