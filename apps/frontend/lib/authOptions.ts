import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import EmailProvider from "next-auth/providers/email"

const useSecureCookies = process.env.NODE_ENV === "production"
const cookiePrefix = useSecureCookies ? "__Secure-" : ""
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN
const cookieDomain = process.env.NODE_ENV === "production" && rootDomain ? `.${rootDomain}` : undefined

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
        ...(cookieDomain ? { domain: cookieDomain } : {})
      }
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        ...(cookieDomain ? { domain: cookieDomain } : {})
      }
    },
    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        ...(cookieDomain ? { domain: cookieDomain } : {})
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
            process.env.NEXT_PUBLIC_BACKEND_URL || 
            process.env.BACKEND_INTERNAL_URL || 
            (typeof window !== 'undefined' ? '' : 'http://backend:4000');
            
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
          const backendCompany = data?.company || backendUser?.company;
          
          if (!backendUser || !backendUser.id) return null;
          
          if (backendUser.isActive) {
            const isOnboardingComplete = backendCompany?.isOnboardingComplete === true;
            return { 
              id: backendUser.id, 
              name: backendUser.name,
              username: backendUser.username,
              email: backendUser.email, 
              companyId: backendUser.companyId || backendCompany?.id || backendCompany?._id,
              role: backendUser.role,
              isOnboardingComplete: isOnboardingComplete,
              isFirstLogin: !isOnboardingComplete && (backendUser.isFirstLogin === true || !backendUser.username),
              companySlug: backendCompany?.slug,
              companyCustomDomain: backendCompany?.customDomain,
              platformToken: data?.token
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
              process.env.NEXT_PUBLIC_BACKEND_URL || 
              process.env.BACKEND_INTERNAL_URL || 
              (typeof window !== 'undefined' ? '' : 'http://backend:4000');
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
           const backendCompany = data?.company || backendUser?.company;
           if (!backendUser || !backendUser.id) return null;
           
           if (backendUser.isActive) {
             const isOnboardingComplete = backendCompany?.isOnboardingComplete === true;
             return { 
               id: backendUser.id, 
               name: backendUser.name,
               username: backendUser.username,
               email: backendUser.email, 
               companyId: backendUser.companyId || backendCompany?.id || backendCompany?._id,
               role: backendUser.role,
               permissions: backendUser.permissions || [],
               isOnboardingComplete: isOnboardingComplete,
               isFirstLogin: !isOnboardingComplete && (backendUser.isFirstLogin === true || !backendUser.username),
               companySlug: backendCompany?.slug,
               companyCustomDomain: backendCompany?.customDomain,
               platformToken: credentials.token
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
        if ((user as any).platformToken) {
          token.platformToken = (user as any).platformToken;
        }
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
        if (session.platformToken !== undefined) token.platformToken = session.platformToken;
      }

      return token;
    },
    async session({ session, token }) {
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
        (session.user as any).platformToken = token.platformToken;
      }
      (session as any).platformToken = token.platformToken;
      return session;
    }
  }
}
