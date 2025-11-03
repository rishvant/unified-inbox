import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface AuthResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: any;
  redirect?: string;
}

export async function GET(request: NextRequest) {
  return handleAuthRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleAuthRequest(request, 'POST');
}

async function handleAuthRequest(request: NextRequest, method: string) {
  try {
    const url = new URL(request.url);
    
    // Prepare headers
    const headers: Record<string, string> = {};
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }

    // Get the body if it's a POST/PUT request
    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      body = await request.text();
    }

    // Create a proper request object for the auth handler
    const authRequest = {
      method,
      url: url.toString(),
      headers,
      ...(body && { body }),
    };

    console.log('Auth request:', {
      method,
      path: url.pathname,
      hasBody: !!body,
      headers: Object.keys(headers),
    });

    // Call the auth handler
    const response = await (auth.handler as any)(authRequest) as AuthResponse;

    // Handle redirects
    if (response?.redirect) {
      console.log('Redirecting to:', response.redirect);
      return NextResponse.redirect(new URL(response.redirect, url.origin));
    }

    // Return the response
    const responseBody = typeof response?.body === 'string' 
      ? response.body 
      : JSON.stringify(response?.body || {});

    return new NextResponse(responseBody, {
      status: response?.status || 200,
      headers: {
        'Content-Type': 'application/json',
        ...response?.headers,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Authentication failed',
        details: errorMessage,
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}