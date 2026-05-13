import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RoleType, ModuleType } from "@/generated/prisma/client";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const existingRoles = await prisma.role.findFirst();
    if (existingRoles) {
      return NextResponse.json({ message: "System already initialized" });
    }

    const roles = await prisma.$transaction(async (tx) => {
      const superAdmin = await tx.role.create({
        data: {
          name: "Super Admin",
          type: "SUPER_ADMIN",
          description: "Full system access across all organizations",
        },
      });

      const orgAdmin = await tx.role.create({
        data: {
          name: "Organization Admin",
          type: "ORG_ADMIN",
          description: "Full access within their organization",
        },
      });

      const moduleAdmin = await tx.role.create({
        data: {
          name: "Module Admin",
          type: "MODULE_ADMIN",
          description: "Can manage specific modules",
        },
      });

      const contributor = await tx.role.create({
        data: {
          name: "Contributor",
          type: "CONTRIBUTOR",
          description: "Can create and edit content",
        },
      });

      const viewer = await tx.role.create({
        data: {
          name: "Viewer",
          type: "VIEWER",
          description: "Read-only access",
        },
      });

      const respondent = await tx.role.create({
        data: {
          name: "Respondent",
          type: "RESPONDENT",
          description: "Can only respond to surveys",
        },
      });

      return [superAdmin, orgAdmin, moduleAdmin, contributor, viewer, respondent];
    });

    const modules = await prisma.$transaction(async (tx) => {
      const generalSurvey = await tx.module.create({
        data: {
          type: "GENERAL_SURVEY",
          name: "General Surveys",
          description: "Standard internal surveys with identifiable users",
        },
      });

      const anonymousSurvey = await tx.module.create({
        data: {
          type: "ANONYMOUS_SURVEY",
          name: "Anonymous Surveys",
          description: "Completely anonymous feedback collection",
        },
      });

      const whistleblowing = await tx.module.create({
        data: {
          type: "WHISTLEBLOWING",
          name: "Whistleblowing",
          description: "Secure confidential reporting system",
        },
      });

      return [generalSurvey, anonymousSurvey, whistleblowing];
    });

    const orgAdminRole = roles.find((r) => r.type === "ORG_ADMIN")!;
    for (const mod of modules) {
      await prisma.permission.create({
        data: {
          roleId: orgAdminRole.id,
          moduleId: mod.id,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        },
      });
    }

    const moduleAdminRole = roles.find((r) => r.type === "MODULE_ADMIN")!;
    for (const mod of modules) {
      await prisma.permission.create({
        data: {
          roleId: moduleAdminRole.id,
          moduleId: mod.id,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        },
      });
    }

    const contributorRole = roles.find((r) => r.type === "CONTRIBUTOR")!;
    for (const mod of modules) {
      await prisma.permission.create({
        data: {
          roleId: contributorRole.id,
          moduleId: mod.id,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: false,
        },
      });
    }

    const viewerRole = roles.find((r) => r.type === "VIEWER")!;
    for (const mod of modules) {
      await prisma.permission.create({
        data: {
          roleId: viewerRole.id,
          moduleId: mod.id,
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        },
      });
    }

    return NextResponse.json({
      message: "System initialized successfully",
      roles: roles.length,
      modules: modules.length,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Initialization failed" }, { status: 500 });
  }
}
