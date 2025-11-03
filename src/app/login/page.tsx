"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);

    // Email/Password login
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isSignUp) {
                const name = email.split("@")[0]; // Use email prefix as name
                await signUp.email({
                    email,
                    password,
                    name,
                });
            } else {
                await signIn.email({
                    email,
                    password,
                });
            }
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    // Common OAuth handler
    const handleOAuthLogin = async (provider: string) => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/sign-in/social', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider,
                    callbackURL: '/dashboard',
                }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate login');
            }

            // Redirect to the OAuth provider's login page
            window.location.href = data.url;
        } catch (err) {
            setError(err instanceof Error ? err.message : `${provider} login failed`);
            setLoading(false);
        }
    };

    // GitHub OAuth
    const handleGitHubLogin = () => handleOAuthLogin('github');

    // Google OAuth
    const handleGoogleLogin = () => handleOAuthLogin('google');

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Unified Inbox</h1>
                <p className="text-gray-600 mb-6">
                    {isSignUp ? "Create your account" : "Sign in to your account"}
                </p>

                {/* OAuth Buttons */}
                <div className="space-y-3 mb-6">
                    <button
                        onClick={handleGitHubLogin}
                        disabled={loading}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition"
                    >
                        🐙 Continue with GitHub
                    </button>
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition"
                    >
                        🔵 Continue with Google
                    </button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                    </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            minLength={8}
                            required
                        />
                        {isSignUp && (
                            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
                    >
                        {loading
                            ? "Processing..."
                            : isSignUp
                                ? "Create Account"
                                : "Sign In"}
                    </button>
                </form>

                {/* Toggle Sign Up/Sign In */}
                <p className="text-center text-gray-600">
                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-blue-600 hover:underline font-medium"
                    >
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                </p>
            </div>
        </div>
    );
}