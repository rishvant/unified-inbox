import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    if (!provider) {
      return new NextResponse(
        JSON.stringify({ error: "Provider is required" }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create the OAuth authorization URL
    const authUrl = new URL(`/api/auth/oauth/${provider}`, process.env.BETTER_AUTH_URL || 'http://localhost:3000');
    authUrl.searchParams.set('callbackUrl', callbackUrl);

    // Redirect to the OAuth provider's authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : String(error)
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
