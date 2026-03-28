// Test SSO Endpoint - Creates a mock user for testing
import { NextRequest, NextResponse } from 'next/server';

// Mock user for testing
const MOCK_USER = {
  id: 'test-user-123',
  email: 'test@dayf.com',
  displayName: 'Test User',
  firstName: 'Test',
  lastName: 'User',
};

// Generate a test token
function generateTestToken(): string {
  const payload = {
    userId: MOCK_USER.id,
    email: MOCK_USER.email,
    timestamp: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

// GET - Get mock user info for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'token') {
    const token = generateTestToken();
    return NextResponse.json({
      token,
      user: MOCK_USER,
      message: 'Use this token for SSO testing',
    });
  }
  
  if (action === 'sso-test') {
    return NextResponse.json({
      ssoUrl: '/api/sso/discourse',
      user: MOCK_USER,
      instructions: 'Visit Discourse to trigger SSO flow',
    });
  }
  
  return NextResponse.json({
    status: 'ok',
    message: 'SSO Test Endpoint',
    user: MOCK_USER,
    endpoints: {
      getToken: '/api/sso/test?action=token',
      testInfo: '/api/sso/test?action=sso-test',
    },
  });
}

// POST - Create mock session for testing
export async function POST(request: NextRequest) {
  const token = generateTestToken();
  
  const response = NextResponse.json({
    success: true,
    token,
    user: MOCK_USER,
  });
  
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
  
  return response;
}
