import { RoleType, ModuleType, CaseStatus, QuestionType, FormStyle, SurveyStatus } from "@/generated/prisma/client";

export type { RoleType, ModuleType, CaseStatus, QuestionType, FormStyle, SurveyStatus };

export interface UserWithMembership {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  memberships: MembershipWithOrg[];
}

export interface MembershipWithOrg {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };
  role: RoleWithPermissions;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  type: RoleType;
  permissions: PermissionWithModule[];
}

export interface PermissionWithModule {
  id: string;
  moduleId: string;
  module: {
    id: string;
    type: ModuleType;
    name: string;
  };
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface OrgContext {
  organizationId: string;
  organizationSlug: string;
  membershipId: string;
  roleType: RoleType;
}

export interface SurveyWithQuestions {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  formStyle: FormStyle;
  questions: SurveyQuestionItem[];
  responseCount?: number;
}

export interface SurveyQuestionItem {
  id: string;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  order: number;
  options: string | null;
}

export interface CaseWithDetails {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: string;
  isAnonymous: boolean;
  createdAt: Date;
  reporterName?: string;
  messageCount?: number;
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
  module?: ModuleType;
}
