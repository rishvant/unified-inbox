import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { provider, callbackUrl = '/dashboard' } = await request.json();
    
    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    // Create a URL for the OAuth flow
    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    const oauthUrl = new URL(`/api/auth/oauth/authorize`, baseUrl);
    oauthUrl.searchParams.set('provider', provider);
    oauthUrl.searchParams.set('callbackUrl', callbackUrl);
    
    return NextResponse.json({ 
      url: oauthUrl.toString() 
    });
  } catch (error) {
    console.error("Social sign-in error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to initiate social sign-in"
      },
      { status: 500 }
    );
  }
}
