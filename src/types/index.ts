import { RoleType, CaseStatus, QuestionType, FormStyle, SurveyStatus } from "@/generated/prisma/client";

export type { RoleType, CaseStatus, QuestionType, FormStyle, SurveyStatus };

export interface UserWithMembership {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  membership: {
    id: string;
    organizationId: string;
    organization: { id: string; name: string; slug: string; logo: string | null };
    role: { id: string; name: string; type: RoleType };
  } | null;
}

export interface DashboardStats {
  totalSurveys: number;
  activeSurveys: number;
  totalResponses: number;
  totalCases: number;
  openCases: number;
  responseRate: number;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
}
