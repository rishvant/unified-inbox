import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

interface OAuthResponse {
  redirect?: string;
  body?: any;
  status?: number;
  headers?: Record<string, string>;
}

export async function GET(
  request: Request,
  { params }: { params: { provider: string[] } }
) {
  try {
    const provider = params.provider?.[0];
    if (!provider) {
      return new NextResponse("Provider is required", { status: 400 });
    }

    // Get the callback URL from the query parameters
    const { searchParams } = new URL(request.url);
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    // Create headers object
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Handle the OAuth callback
    const response = await (auth.handler as any)({
      method: 'GET',
      url: request.url,
      headers,
    }) as OAuthResponse;

    // If we have a redirect URL, use it
    if (response?.redirect) {
      return NextResponse.redirect(new URL(response.redirect, request.url));
    }

    // If we have a response, return it
    if (response?.body) {
      return new NextResponse(JSON.stringify(response.body), {
        status: response.status || 200,
        headers: {
          'Content-Type': 'application/json',
          ...response.headers,
        },
      });
    }

    // Default redirect if no response from the handler
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  } catch (error) {
    console.error("OAuth error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Authentication failed" }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
