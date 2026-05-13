import { ModuleType } from "@/generated/prisma/client";

export const APP_NAME = "TRUCORE";
export const APP_TAGLINE = "Speak Freely. Report Safely.";

export const MODULE_LABELS: Record<string, string> = {
  GENERAL_SURVEY: "General Surveys",
  ANONYMOUS_SURVEY: "Anonymous Surveys",
  WHISTLEBLOWING: "Whistleblowing",
};

export const MODULE_ICONS: Record<string, string> = {
  GENERAL_SURVEY: "ClipboardList",
  ANONYMOUS_SURVEY: "EyeOff",
  WHISTLEBLOWING: "Shield",
};

export const SURVEY_CATEGORIES = [
  "Employee Engagement",
  "Workplace Culture",
  "Performance Review",
  "Training & Development",
  "Diversity & Inclusion",
  "Health & Safety",
  "Job Satisfaction",
  "Leadership Feedback",
  "Compensation & Benefits",
  "General Feedback",
];

export const CASE_CATEGORIES = [
  "Harassment",
  "Discrimination",
  "Fraud",
  "Ethical Violations",
  "Safety Concerns",
  "Management Misconduct",
  "Policy Violations",
  "Financial Irregularities",
  "Data Breach",
  "Other",
];

export const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

export const CASE_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  UNDER_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ESCALATED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};
