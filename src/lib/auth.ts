import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", signOut: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) throw new Error("Invalid credentials");
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { membership: { include: { organization: true, role: true } } },
        });
        if (!user || !user.password) throw new Error("Invalid credentials");
        if (!(await bcrypt.compare(credentials.password, user.password))) throw new Error("Invalid credentials");
        if (!user.isActive) throw new Error("Account is deactivated");
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          membership: user.membership ? {
            id: user.membership.id,
            organizationId: user.membership.organizationId,
            organization: { id: user.membership.organization.id, name: user.membership.organization.name, slug: user.membership.organization.slug },
            role: { id: user.membership.role.id, name: user.membership.role.name, type: user.membership.role.type },
          } : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.membership = (user as any).membership;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).membership = token.membership;
      }
      return session;
    },
  },
};
