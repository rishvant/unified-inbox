import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    // Get provider from params
    const provider = params.provider;
    console.log("OAuth provider:", provider);
    
    if (!provider) {
      return new NextResponse(
        JSON.stringify({ error: "Provider is required" }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the callback URL from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    
    // Create the OAuth URL for the provider
    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    const authUrl = new URL(`/api/auth/oauth/${provider}`, baseUrl);
    
    // Add any additional parameters needed by the provider
    authUrl.searchParams.set('callbackUrl', callbackUrl);

    console.log("Redirecting to provider's OAuth URL:", authUrl.toString());
    
    // Redirect to the provider's OAuth URL
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("OAuth error:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "OAuth authentication failed",
        details: error instanceof Error ? error.message : String(error)
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
