import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      return new NextResponse("Authorization code is required", { status: 400 });
    }

    // Exchange the code for an access token
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/callback/github`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to get access token');
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${data.access_token}`,
        'Accept': 'application/json',
      },
    });

    const user = await userResponse.json();

    // Create or update the user in the database
    const authResponse = await auth.handler({
      method: 'POST',
      url: '/api/auth/callback/github',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'github',
        profile: {
          id: user.id,
          name: user.name || user.login,
          email: user.email,
          image: user.avatar_url,
        },
        tokens: data,
      }),
    });

    // Redirect to the dashboard on success
    if (authResponse.redirect) {
      return NextResponse.redirect(authResponse.redirect);
    }

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('GitHub callback error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error instanceof Error ? error.message : 'Authentication failed')}`, request.url)
    );
  }
}
