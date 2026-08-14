import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import EmailProvider from "next-auth/providers/email"

const useSecureCookies = process.env.NODE_ENV === "production"
const cookiePrefix = useSecureCookies ? "__Secure-" : ""
const cookieDomain = process.env.NODE_ENV === "production" ? ".180workspace.com" : undefined

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "5196aa96c36083e22fda242c96eb50b636d481f16da7117177ba037334341575",
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: cookieDomain,
      }
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: cookieDomain,
      }
    },
    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: cookieDomain,
      }
    }
  },
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
        
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
            (process.env.NODE_ENV === 'production' ? 'https://api.workspace.pitchin180.com' : 'http://localhost:4002');
            
          const res = await fetch(`${apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: credentials.email.toLowerCase(), 
              password: credentials.password 
            }),
            cache: 'no-store'
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error(`[NextAuth Credentials] /api/auth/login failed: ${res.status} ${res.statusText}`, errorText);
            return null;
          }
          
          const data = await res.json();
          const backendUser = data?.user;
          const backendCompany = data?.company;
          
          if (!backendUser || !backendUser.id) return null;
          
          if (backendUser.isActive) {
            const isLegacyOrAdmin = !!backendUser.companyId || (backendUser.role && backendUser.role !== 'employee' && backendUser.role !== 'USER');
            return { 
              id: backendUser.id, 
              name: backendUser.name,
              username: backendUser.username,
              email: backendUser.email, 
              companyId: backendUser.companyId || backendCompany?.id,
              role: backendUser.role,
              isOnboardingComplete: backendCompany?.isOnboardingComplete || false,
              isFirstLogin: isLegacyOrAdmin ? false : backendUser.isFirstLogin,
              companySlug: backendCompany?.slug,
              companyCustomDomain: backendCompany?.customDomain
            } as any
          }
        } catch(e) {
          console.error("Credentials auth error:", e);
        }
        return null;
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
             (process.env.NODE_ENV === 'production' ? 'https://api.workspace.pitchin180.com' : 'http://localhost:4002');
           const res = await fetch(`${apiUrl}/api/auth/me`, {
             headers: {
               Authorization: `Bearer ${credentials.token}`
             },
             cache: 'no-store'
           });
           if (!res.ok) {
             const errorText = await res.text();
             console.error(`[NextAuth platform-token] /api/auth/me failed: ${res.status} ${res.statusText}`, errorText);
             return null;
           }
           
           const data = await res.json();
           const backendUser = data?.user;
           if (!backendUser || !backendUser.id) return null;
           
           if (backendUser.isActive) {
             const isLegacyOrAdmin = !!backendUser.companyId || (backendUser.role && backendUser.role !== 'employee' && backendUser.role !== 'USER');
             return { 
               id: backendUser.id, 
               name: backendUser.name,
               username: backendUser.username,
               email: backendUser.email, 
               companyId: backendUser.companyId,
               role: backendUser.role,
               permissions: backendUser.permissions || [],
               isOnboardingComplete: data.company?.isOnboardingComplete || false,
               isFirstLogin: isLegacyOrAdmin ? false : backendUser.isFirstLogin,
               companySlug: data.company?.slug,
               companyCustomDomain: data.company?.customDomain
             } as any
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
        token.companySlug = (user as any).companySlug;
        token.companyCustomDomain = (user as any).companyCustomDomain;
      }
      
      // Handle manual session updates (e.g., after workspace setup is completed)
      if (trigger === "update" && session) {
        if (session.companyId !== undefined) token.companyId = session.companyId;
        if (session.role !== undefined) token.role = session.role;
        if (session.permissions !== undefined) token.permissions = session.permissions;
        if (session.isOnboardingComplete !== undefined) token.isOnboardingComplete = session.isOnboardingComplete;
        if (session.isFirstLogin !== undefined) token.isFirstLogin = session.isFirstLogin;
        if (session.username !== undefined) token.username = session.username;
        if (session.companySlug !== undefined) token.companySlug = session.companySlug;
        if (session.companyCustomDomain !== undefined) token.companyCustomDomain = session.companyCustomDomain;
      }

      // In a fully decoupled frontend, we trust the JWT contents (which are signed).
      // Backend API calls will enforce security (e.g. if user is disabled, API returns 401).
      if (token.id || token.email) {
        // We no longer query Prisma here to avoid DB connection issues on Vercel.
        // The token already contains the user data we need.
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
        (session.user as any).companySlug = token.companySlug;
        (session.user as any).companyCustomDomain = token.companyCustomDomain;
      }
      return session;
    }
  }
}
