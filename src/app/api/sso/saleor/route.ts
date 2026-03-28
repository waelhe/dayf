// Saleor OAuth Integration Endpoint
// يتكامل مع Saleor لتسجيل الدخول الموحد

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Saleor Configuration
const SALEOR_URL = process.env.SALEOR_URL || 'http://localhost:3002';
const SALEOR_GRAPHQL_URL = `${SALEOR_URL}/graphql/`;

// OAuth App Credentials (from Saleor Dashboard)
const SALEOR_APP_ID = process.env.SALEOR_APP_ID || 'dayf-integration';
const SALEOR_APP_SECRET = process.env.SALEOR_APP_SECRET || 'dayf_saleor_oauth_secret_2025';

interface SaleorUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isStaff?: boolean;
}

interface TokenPayload {
  userId: string;
  email: string;
  timestamp: number;
}

// Generate JWT-like token for Saleor
function generateToken(user: SaleorUser): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    timestamp: Date.now(),
  };
  
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', SALEOR_APP_SECRET)
    .update(payloadBase64)
    .digest('base64url');
  
  return `${payloadBase64}.${signature}`;
}

// Verify token from Saleor
function verifyToken(token: string): TokenPayload | null {
  try {
    const [payloadBase64, signature] = token.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', SALEOR_APP_SECRET)
      .update(payloadBase64)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payloadStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

// GraphQL mutation to create or get user in Saleor
async function syncUserWithSaleor(user: SaleorUser): Promise<{ success: boolean; saleorId?: string; error?: string }> {
  try {
    const mutation = `
      mutation UserCreateOrUpdate($email: String!, $firstName: String, $lastName: String) {
        userCreateOrUpdate(
          input: {
            email: $email
            firstName: $firstName
            lastName: $lastName
          }
        ) {
          user {
            id
            email
          }
          errors {
            field
            message
          }
        }
      }
    `;

    const response = await fetch(SALEOR_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        },
      }),
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('[Saleor OAuth] GraphQL errors:', data.errors);
      return { success: false, error: data.errors[0]?.message };
    }

    if (data.data?.userCreateOrUpdate?.errors?.length > 0) {
      return { success: false, error: data.data.userCreateOrUpdate.errors[0]?.message };
    }

    return { 
      success: true, 
      saleorId: data.data?.userCreateOrUpdate?.user?.id 
    };
  } catch (error) {
    console.error('[Saleor OAuth] Sync error:', error);
    return { success: false, error: 'فشل الاتصال بـ Saleor' };
  }
}

// OAuth Authorization Endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const redirectUri = searchParams.get('redirect_uri');

    // Handle OAuth callback
    if (action === 'callback' && code) {
      // Verify state
      const stateData = verifyToken(state || '');
      if (!stateData) {
        return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
      }

      // Exchange code for token (simulated - in real OAuth this would call Saleor)
      // For now, we create a session token
      const token = generateToken({
        id: stateData.userId,
        email: stateData.email,
      });

      const redirectUrl = new URL(redirectUri || SALEOR_URL);
      redirectUrl.searchParams.set('token', token);
      
      return NextResponse.redirect(redirectUrl);
    }

    // Handle OAuth authorization request
    if (action === 'authorize') {
      const userId = searchParams.get('user_id');
      const email = searchParams.get('email');
      const firstName = searchParams.get('first_name');
      const lastName = searchParams.get('last_name');

      if (!userId || !email) {
        return NextResponse.json({ error: 'Missing user info' }, { status: 400 });
      }

      // Sync user with Saleor
      const syncResult = await syncUserWithSaleor({
        id: userId,
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      if (!syncResult.success) {
        return NextResponse.json({ error: syncResult.error }, { status: 500 });
      }

      // Generate authorization code
      const code = crypto.randomBytes(16).toString('base64url');
      const state = generateToken({ id: userId, email });

      const callbackUrl = new URL(request.url);
      callbackUrl.searchParams.set('action', 'callback');
      callbackUrl.searchParams.set('code', code);
      callbackUrl.searchParams.set('state', state);

      return NextResponse.redirect(callbackUrl);
    }

    // Default: Return OAuth info
    return NextResponse.json({
      status: 'ok',
      service: 'Saleor OAuth',
      appId: SALEOR_APP_ID,
      endpoints: {
        authorize: '/api/sso/saleor?action=authorize',
        callback: '/api/sso/saleor?action=callback',
      },
    });

  } catch (error) {
    console.error('[Saleor OAuth] Error:', error);
    return NextResponse.json({ error: 'OAuth error' }, { status: 500 });
  }
}

// Token exchange endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { grant_type, code, redirect_uri, client_id, client_secret } = body;

    // Verify client credentials
    if (client_id !== SALEOR_APP_ID || client_secret !== SALEOR_APP_SECRET) {
      return NextResponse.json({ error: 'Invalid client credentials' }, { status: 401 });
    }

    if (grant_type === 'authorization_code') {
      // Exchange code for token
      const token = generateToken({
        id: 'dayf_user',
        email: 'user@dayf.com',
      });

      return NextResponse.json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600,
      });
    }

    if (grant_type === 'refresh_token') {
      // Refresh token
      const token = generateToken({
        id: 'dayf_user',
        email: 'user@dayf.com',
      });

      return NextResponse.json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600,
      });
    }

    return NextResponse.json({ error: 'Unsupported grant type' }, { status: 400 });

  } catch (error) {
    console.error('[Saleor OAuth] Token exchange error:', error);
    return NextResponse.json({ error: 'Token exchange error' }, { status: 500 });
  }
}

// User info endpoint
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({
      id: payload.userId,
      email: payload.email,
      sub: payload.userId,
    });

  } catch (error) {
    console.error('[Saleor OAuth] User info error:', error);
    return NextResponse.json({ error: 'User info error' }, { status: 500 });
  }
}
