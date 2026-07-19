import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@workspace/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
    newUser: '/workspace-setup'
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { company: true }
        })
        
        if (user && user.password) {
          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (isValid) {
            if (!user.isActive) throw new Error("Account is inactive.");
              const isLegacyOrAdmin = !!user.companyId || (user.role && user.role !== 'employee' && user.role !== 'USER');
              return { 
                id: user.id, 
                name: user.name,
                username: user.username,
                email: user.email, 
                companyId: user.companyId,
                role: user.role,
                isOnboardingComplete: user.company?.isOnboardingComplete || false,
                isFirstLogin: isLegacyOrAdmin ? false : user.isFirstLogin
              } as any
          }
        }
        return null
      }
    }),
    CredentialsProvider({
      id: 'platform-token',
      name: 'Platform Token',
      credentials: {
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials, req) {
        if (!credentials?.token) return null;
        
        try {
           const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
             (process.env.NODE_ENV === 'production' ? 'https://api.workspace.pitchin180.com' : 'http://localhost:4000');
           const res = await fetch(`${apiUrl}/api/auth/me`, {
             headers: {
               Authorization: `Bearer ${credentials.token}`
             }
           });
           if (!res.ok) {
             const errorText = await res.text();
             console.error(`[NextAuth platform-token] /api/auth/me failed: ${res.status} ${res.statusText}`, errorText);
             return null;
           }
           
           const data = await res.json();
           const userId = data?.user?.id || data?.user?.id;
           if (!userId) return null;
           
           const user = await prisma.user.findUnique({
              where: { id: userId },
              include: { company: true }
           });
           
           if (user && user.isActive) {
             const isLegacyOrAdmin = !!user.companyId || (user.role && user.role !== 'employee' && user.role !== 'USER');
             return { 
               id: user.id, 
               name: user.name,
               username: user.username,
               email: user.email, 
               companyId: user.companyId,
               role: user.role,
               permissions: user.permissions || [],
               isOnboardingComplete: user.company?.isOnboardingComplete || false,
               isFirstLogin: isLegacyOrAdmin ? false : user.isFirstLogin
             } as any;
           }
        } catch(e) {
           console.error("Platform token auth error:", e);
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      console.log('[JWT] incoming token:', JSON.stringify(token));

      // Initialize or update token on sign in
      if (user) {
        token.id = user.id || token.sub;
        token.username = (user as any).username;
        token.companyId = (user as any).companyId;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions || [];
        token.isOnboardingComplete = (user as any).isOnboardingComplete;
        token.isFirstLogin = (user as any).isFirstLogin;
      }
      
      // Handle manual session updates (e.g., after workspace setup is completed)
      if (trigger === "update" && session) {
        if (session.companyId !== undefined) token.companyId = session.companyId;
        if (session.role !== undefined) token.role = session.role;
        if (session.permissions !== undefined) token.permissions = session.permissions;
        if (session.isOnboardingComplete !== undefined) token.isOnboardingComplete = session.isOnboardingComplete;
        if (session.isFirstLogin !== undefined) token.isFirstLogin = session.isFirstLogin;
        if (session.username !== undefined) token.username = session.username;
      }

      // Always verify user against database to ensure server-side security and session validity
      if (token.id || token.email) {
        try {
          const dbUser = await prisma.user.findUnique({ 
            where: token.id ? { id: token.id as string } : { email: token.email as string },
            include: { company: true }
          });
          
          if (!dbUser || !dbUser.isActive || dbUser.deletedAt) {
            // User disabled or deleted, invalidate token
            return {};
          }
          
          // Ensure token.id is set correctly to the DB id
          token.id = dbUser.id;
          token.companyId = dbUser.companyId;
          token.username = dbUser.username;
          token.role = dbUser.role;
          token.permissions = dbUser.permissions || [];
          
          // Only trust DB for onboarding if it's true or if token isn't already true (prevent race condition)
          const dbOnboardingComplete = dbUser.company?.isOnboardingComplete || false;
          if (dbOnboardingComplete) token.isOnboardingComplete = true;
          
          const isLegacyOrAdmin = !!dbUser.companyId || (dbUser.role && dbUser.role !== 'employee' && dbUser.role !== 'USER');
          const dbIsFirstLogin = isLegacyOrAdmin ? false : dbUser.isFirstLogin;
          // Prevent race condition: if token is already false due to manual update, keep it false
          if (!dbIsFirstLogin) token.isFirstLogin = false;
          
        } catch(e) {
          console.error("Session DB verification error:", e);
          // Don't crash the session, keep existing token values
        }
      }

      return token;
    },
    async session({ session, token }) {
      console.log('[Session Callback] token:', JSON.stringify(token));
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).companyId = token.companyId;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions || [];
        (session.user as any).isOnboardingComplete = token.isOnboardingComplete;
        (session.user as any).isFirstLogin = token.isFirstLogin;
      }
      return session;
    }
  }
}
