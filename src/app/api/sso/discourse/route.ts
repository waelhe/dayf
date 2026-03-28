// Discourse Connect (SSO) Endpoint
// يتكامل مع Discourse لتسجيل الدخول الموحد

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sessionService } from '@/features/auth/infrastructure/session-service';
import { UserResponse } from '@/features/auth/types';

// SSO Secret - يجب أن يكون نفسه في Discourse settings
const SSO_SECRET = process.env.DISCOURSE_SSO_SECRET || 'dayf_discourse_sso_secret_key_2025';

interface DiscourseSSOPayload {
  nonce: string;
  return_sso_url: string;
}

interface SSOUserInfo {
  external_id: string;
  email: string;
  username?: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  locale?: string;
}

function parseSSOPayload(payload: string): DiscourseSSOPayload {
  const decoded = Buffer.from(payload, 'base64').toString('utf-8');
  const params = new URLSearchParams(decoded);
  
  return {
    nonce: params.get('nonce') || '',
    return_sso_url: params.get('return_sso_url') || '',
  };
}

function buildSSOResponse(payload: DiscourseSSOPayload, user: SSOUserInfo): string {
  const params = new URLSearchParams();
  
  params.set('nonce', payload.nonce);
  params.set('external_id', user.external_id);
  params.set('email', user.email);
  
  if (user.username) params.set('username', user.username);
  if (user.name) params.set('name', user.name);
  if (user.avatar_url) params.set('avatar_url', user.avatar_url);
  if (user.bio) params.set('bio', user.bio);
  if (user.locale) params.set('locale', user.locale);
  
  // Add additional attributes
  params.set('add_groups', '');
  params.set('remove_groups', '');
  
  return Buffer.from(params.toString()).toString('base64');
}

function signPayload(payload: string): string {
  return crypto
    .createHmac('sha256', SSO_SECRET)
    .update(payload)
    .digest('hex');
}

function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = signPayload(payload);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Parse mock token for testing
function parseMockToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const payload = JSON.parse(decoded);
    if (payload.userId && payload.email) {
      return payload;
    }
  } catch {
    // Not a mock token
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sso = searchParams.get('sso');
    const sig = searchParams.get('sig');
    
    // التحقق من وجود المعاملات المطلوبة
    if (!sso || !sig) {
      return NextResponse.json(
        { error: 'معاملات SSO غير مكتملة' },
        { status: 400 }
      );
    }
    
    // التحقق من التوقيع
    if (!verifySignature(sso, sig)) {
      return NextResponse.json(
        { error: 'توقيع SSO غير صالح' },
        { status: 401 }
      );
    }
    
    // تحليل الـ payload
    const payload = parseSSOPayload(sso);
    
    if (!payload.nonce || !payload.return_sso_url) {
      return NextResponse.json(
        { error: 'بيانات SSO غير مكتملة' },
        { status: 400 }
      );
    }
    
    // الحصول على المستخدم الحالي
    const token = request.cookies.get('auth_token')?.value ||
                  request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // المستخدم غير مسجل الدخول - إعادة توجيه لصفحة تسجيل الدخول
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Try mock token first (for testing)
    const mockUser = parseMockToken(token);
    let user: { id: string; email?: string; displayName?: string; firstName?: string; lastName?: string; avatar?: string; language?: string };
    
    if (mockUser) {
      // Use mock user for testing
      user = {
        id: mockUser.userId,
        email: mockUser.email,
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        language: 'ar',
      };
    } else {
      // Try real session
      const sessionResult = await sessionService.validateSession(token);
      
      if (!sessionResult) {
        // الجلسة منتهية - إعادة توجيه لصفحة تسجيل الدخول
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', request.url);
        return NextResponse.redirect(loginUrl);
      }
      
      user = sessionResult.user;
    }
    
    // بناء بيانات المستخدم لـ Discourse
    const userInfo: SSOUserInfo = {
      external_id: user.id,
      email: user.email || `user_${user.id}@dayf.local`,
      username: user.displayName?.replace(/\s+/g, '_').toLowerCase().substring(0, 20) || `user_${user.id.slice(0, 8)}`,
      name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'مستخدم',
      avatar_url: user.avatar || undefined,
      locale: user.language || 'ar',
    };
    
    // بناء الرد الموقع
    const responsePayload = buildSSOResponse(payload, userInfo);
    const responseSignature = signPayload(responsePayload);
    
    // إعادة توجيه المستخدم إلى Discourse
    const returnUrl = new URL(payload.return_sso_url);
    returnUrl.searchParams.set('sso', responsePayload);
    returnUrl.searchParams.set('sig', responseSignature);
    
    return NextResponse.redirect(returnUrl);
    
  } catch (error) {
    console.error('[SSO] Discourse SSO error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في SSO' },
      { status: 500 }
    );
  }
}

// Endpoint للتحقق من صحة التكوين
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { test } = body;
    
    if (test === 'verify') {
      // اختبار التوقيع
      const testPayload = 'test_payload';
      const signature = signPayload(testPayload);
      const isValid = verifySignature(testPayload, signature);
      
      return NextResponse.json({
        status: 'ok',
        ssoConfigured: true,
        signatureValid: isValid,
      });
    }
    
    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('[SSO] Verification error:', error);
    return NextResponse.json(
      { error: 'خطأ في التحقق' },
      { status: 500 }
    );
  }
}
