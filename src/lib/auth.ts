import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as any),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            memberships: {
              include: {
                organization: true,
                role: {
                  include: {
                    permissions: { include: { module: true } },
                  },
                },
              },
            },
          },
        });

        if (!user || !user.password) throw new Error("Invalid credentials");
        if (!(await bcrypt.compare(credentials.password, user.password))) throw new Error("Invalid credentials");
        if (!user.isActive) throw new Error("Account is deactivated");

        // Serialize minimal membership data for JWT (avoid circular refs)
        const memberships = user.memberships.map((m) => ({
          id: m.id,
          userId: m.userId,
          organizationId: m.organizationId,
          roleId: m.roleId,
          organization: { id: m.organization.id, name: m.organization.name, slug: m.organization.slug, logo: m.organization.logo },
          role: {
            id: m.role.id,
            name: m.role.name,
            type: m.role.type,
            permissions: m.role.permissions.map((p) => ({
              id: p.id,
              moduleId: p.moduleId,
              module: { id: p.module.id, type: p.module.type, name: p.module.name },
              canView: p.canView,
              canCreate: p.canCreate,
              canEdit: p.canEdit,
              canDelete: p.canDelete,
            })),
          },
        }));

        return { id: user.id, email: user.email, name: user.name, image: user.image, memberships };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.memberships = (user as any).memberships;
      }
      if (trigger === "update" && session?.memberships) {
        token.memberships = session.memberships;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).memberships = token.memberships || [];
      }
      return session;
    },
  },
};
