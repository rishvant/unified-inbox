import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

// ADD LOGGING TO DEBUG
console.log("🔐 Auth Env Check:");
console.log("- GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✓" : "✗ MISSING");
console.log("- GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✓" : "✗ MISSING");
console.log("- GITHUB_CLIENT_ID:", process.env.GITHUB_CLIENT_ID ? "✓" : "✗ MISSING");
console.log("- GITHUB_CLIENT_SECRET:", process.env.GITHUB_CLIENT_SECRET ? "✓" : "✗ MISSING");

const authConfig = {
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    basePath: "/api/auth",

    providers: [
        {
            id: 'github',
            name: 'GitHub',
            type: 'oauth',
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            authorization: {
                url: 'https://github.com/login/oauth/authorize',
                params: { 
                    scope: 'user:email',
                    redirect_uri: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/callback/github`
                }
            },
            token: 'https://github.com/login/oauth/access_token',
            userinfo: 'https://api.github.com/user',
            profile(profile) {
                return {
                    id: profile.id,
                    name: profile.name || profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                };
            },
        },
        {
            id: 'google',
            name: 'Google',
            type: 'oauth',
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                url: 'https://accounts.google.com/o/oauth2/v2/auth',
                params: {
                    prompt: 'consent',
                    access_type: 'offline',
                    response_type: 'code',
                    scope: 'openid email profile',
                    redirect_uri: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`
                }
            },
            token: 'https://oauth2.googleapis.com/token',
            userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                };
            },
        }
    ],

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
    },

    session: {
        expiresIn: 7 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
    },
};

// Create the auth instance
const auth = betterAuth(authConfig);

// Export the auth instance
export { auth };

// Export the auth handler for API routes
export const handler = auth.handler;

// Export the auth instance type
export type Auth = typeof auth;

// Export session type
export type Session = any; // Replace with the correct session type if available

// Helper function to get OAuth URL
export const getOAuthUrl = (provider: string, options: { callbackUrl: string }) => {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const url = new URL(`/api/auth/oauth/${provider}`, baseUrl);
  url.searchParams.set('callbackUrl', options.callbackUrl);
  return url.toString();
};
