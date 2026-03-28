/**
 * Route Protection System - نظام حماية المسارات الجذري
 *
 * هذا الملف يحدد مستوى الحماية لكل API route في التطبيق.
 * الحماية تطبق تلقائياً عبر Next.js middleware - لا يمكن نسيانها.
 *
 * المبدأ: Deny by Default (Constitution Article VI)
 */

export type RouteLevel = 'public' | 'authenticated' | 'owner' | 'admin';

export interface RouteProtection {
  level: RouteLevel;
  pattern: RegExp;
  methods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  resourceType?: string; // للـ owner routes
}

/**
 * المسارات العامة - لا تتطلب مصادقة
 * فقط GET requests عامة، العمليات الأخرى تتطلب مصادقة
 */
export const PUBLIC_ROUTES: RouteProtection[] = [
  // Auth routes
  { level: 'public', pattern: /^\/api\/auth\/login$/, methods: ['POST'] },
  { level: 'public', pattern: /^\/api\/auth\/register$/, methods: ['POST'] },
  { level: 'public', pattern: /^\/api\/auth\/otp\/?/, methods: ['POST', 'GET'] },
  { level: 'public', pattern: /^\/api\/auth\/verify-email$/, methods: ['POST'] },
  { level: 'public', pattern: /^\/api\/auth\/forgot-password$/, methods: ['POST'] },
  { level: 'public', pattern: /^\/api\/auth\/reset-password$/, methods: ['POST'] },

  // Public read operations (GET فقط)
  { level: 'public', pattern: /^\/api\/destinations\/?$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/destinations\/[^/]+$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/activities\/?$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/activities\/[^/]+$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/services\/?$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/services\/[^/]+$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/reviews\/?$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/reviews\/stats\/?/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/reviews\/can-review\/?/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/companies\/?$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/companies\/[^/]+$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/marketplace\/products\/?$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/marketplace\/products\/[^/]+$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/tours\/?$/, methods: ['GET'] },
  { level: 'public', pattern: /^\/api\/tours\/[^/]+$/, methods: ['GET'] },

  // SSO routes (for testing and integration)
  { level: 'public', pattern: /^\/api\/sso\/test\/?$/, methods: ['GET', 'POST'] },
  { level: 'public', pattern: /^\/api\/sso\/discourse\/?$/, methods: ['GET', 'POST'] },
  { level: 'public', pattern: /^\/api\/sso\/saleor\/?$/, methods: ['GET', 'POST', 'PUT'] },

  // Health check
  { level: 'public', pattern: /^\/api\/health$/, methods: ['GET'] },
];

/**
 * المسارات التي تتطلب مصادقة فقط
 * أي مستخدم مسجل يمكنه الوصول
 */
export const AUTHENTICATED_ROUTES: RouteProtection[] = [
  // Bookings
  { level: 'authenticated', pattern: /^\/api\/bookings\/?$/, methods: ['GET', 'POST'] },
  { level: 'authenticated', pattern: /^\/api\/bookings\/[^/]+\/status$/, methods: ['PATCH'] },

  // Cart
  { level: 'authenticated', pattern: /^\/api\/cart\/?$/, methods: ['GET', 'POST', 'DELETE'] },
  { level: 'authenticated', pattern: /^\/api\/cart\/[^/]+$/, methods: ['PATCH', 'DELETE'] },

  // Wishlist
  { level: 'authenticated', pattern: /^\/api\/wishlist\/?$/, methods: ['GET', 'POST', 'DELETE'] },
  { level: 'authenticated', pattern: /^\/api\/wishlist\/check$/, methods: ['GET'] },
  { level: 'authenticated', pattern: /^\/api\/wishlist\/[^/]+$/, methods: ['GET', 'DELETE'] },

  // Orders
  { level: 'authenticated', pattern: /^\/api\/orders\/?$/, methods: ['GET', 'POST'] },
  { level: 'authenticated', pattern: /^\/api\/orders\/[^/]+$/, methods: ['GET'] },

  // Escrow
  { level: 'authenticated', pattern: /^\/api\/escrow\/?$/, methods: ['GET', 'POST'] },

  // Reviews (إنشاء وتعديل)
  { level: 'authenticated', pattern: /^\/api\/reviews\/?$/, methods: ['POST'] },

  // Community
  { level: 'authenticated', pattern: /^\/api\/community\/topics\/?$/, methods: ['GET', 'POST'] },
  { level: 'authenticated', pattern: /^\/api\/community\/replies\/?$/, methods: ['GET', 'POST'] },

  // Profile
  { level: 'authenticated', pattern: /^\/api\/profile\/?$/, methods: ['GET', 'PATCH'] },

  // Disputes
  { level: 'authenticated', pattern: /^\/api\/disputes\/?$/, methods: ['GET', 'POST'] },
];

/**
 * المسارات التي تتطلب ملكية المورد
 * المستخدم يمكنه الوصول لموارده فقط (أو Admin)
 */
export const OWNER_ROUTES: RouteProtection[] = [
  // Bookings - تعديل وحذف
  {
    level: 'owner',
    pattern: /^\/api\/bookings\/([^/]+)$/,
    methods: ['GET', 'PATCH', 'DELETE'],
    resourceType: 'bookings'
  },

  // Reviews - تعديل وحذف
  {
    level: 'owner',
    pattern: /^\/api\/reviews\/([^/]+)$/,
    methods: ['GET', 'PATCH', 'DELETE'],
    resourceType: 'reviews'
  },
  {
    level: 'owner',
    pattern: /^\/api\/reviews\/([^/]+)\/reply$/,
    methods: ['POST'],
    resourceType: 'reviews'
  },
  {
    level: 'owner',
    pattern: /^\/api\/reviews\/([^/]+)\/helpful$/,
    methods: ['POST', 'DELETE'],
    resourceType: 'reviews'
  },

  // Escrow - العمليات على ضمان محدد
  {
    level: 'owner',
    pattern: /^\/api\/escrow\/([^/]+)$/,
    methods: ['GET'],
    resourceType: 'escrows'
  },
  {
    level: 'owner',
    pattern: /^\/api\/escrow\/([^/]+)\/fund$/,
    methods: ['POST'],
    resourceType: 'escrows'
  },
  {
    level: 'owner',
    pattern: /^\/api\/escrow\/([^/]+)\/release$/,
    methods: ['POST'],
    resourceType: 'escrows'
  },
  {
    level: 'owner',
    pattern: /^\/api\/escrow\/([^/]+)\/refund$/,
    methods: ['POST'],
    resourceType: 'escrows'
  },

  // Services - المضيف فقط
  {
    level: 'owner',
    pattern: /^\/api\/services\/([^/]+)$/,
    methods: ['PATCH', 'DELETE'],
    resourceType: 'services'
  },

  // Companies - المالك فقط
  {
    level: 'owner',
    pattern: /^\/api\/companies\/([^/]+)$/,
    methods: ['PATCH', 'DELETE'],
    resourceType: 'companies'
  },

  // Disputes - صاحب النزاع فقط
  {
    level: 'owner',
    pattern: /^\/api\/disputes\/([^/]+)$/,
    methods: ['GET', 'POST'],
    resourceType: 'disputes'
  },
  {
    level: 'owner',
    pattern: /^\/api\/disputes\/([^/]+)\/messages$/,
    methods: ['POST'],
    resourceType: 'disputes'
  },
];

/**
 * المسارات الإدارية - تتطلب صلاحية Admin
 */
export const ADMIN_ROUTES: RouteProtection[] = [
  // Admin Companies
  { level: 'admin', pattern: /^\/api\/admin\/companies\/pending$/, methods: ['GET'] },
  { level: 'admin', pattern: /^\/api\/admin\/companies\/([^/]+)\/verify$/, methods: ['POST'] },
  { level: 'admin', pattern: /^\/api\/admin\/companies\/([^/]+)\/suspend$/, methods: ['POST'] },
  { level: 'admin', pattern: /^\/api\/admin\/companies\/([^/]+)\/unsuspend$/, methods: ['POST'] },

  // Admin Disputes
  { level: 'admin', pattern: /^\/api\/admin\/disputes\/?$/, methods: ['GET'] },
  { level: 'admin', pattern: /^\/api\/admin\/disputes\/([^/]+)\/resolve$/, methods: ['POST'] },

  // Admin Users
  { level: 'admin', pattern: /^\/api\/admin\/users\/?$/, methods: ['GET'] },
  { level: 'admin', pattern: /^\/api\/admin\/users\/([^/]+)$/, methods: ['GET', 'PATCH', 'DELETE'] },

  // Admin Destinations
  { level: 'admin', pattern: /^\/api\/admin\/destinations\/?$/, methods: ['GET', 'POST'] },
  { level: 'admin', pattern: /^\/api\/admin\/destinations\/([^/]+)\/verify$/, methods: ['POST'] },

  // Admin Activities
  { level: 'admin', pattern: /^\/api\/admin\/activities\/?$/, methods: ['GET'] },
  { level: 'admin', pattern: /^\/api\/admin\/activities\/([^/]+)\/approve$/, methods: ['POST'] },

  // Marketplace seed (admin only)
  { level: 'admin', pattern: /^\/api\/marketplace\/products\/seed$/, methods: ['POST'] },
];

/**
 * جميع المسارات المحمية في مصفوفة واحدة
 */
export const ALL_ROUTES: RouteProtection[] = [
  ...PUBLIC_ROUTES,
  ...AUTHENTICATED_ROUTES,
  ...OWNER_ROUTES,
  ...ADMIN_ROUTES,
];

/**
 * تحديد مستوى الحماية لمسار معين
 */
export function getRouteProtection(pathname: string, method: string): RouteProtection | null {
  for (const route of ALL_ROUTES) {
    // التحقق من الـ method
    if (route.methods && !route.methods.includes(method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')) {
      continue;
    }

    // التحقق من الـ pattern
    const match = pathname.match(route.pattern);
    if (match) {
      return {
        ...route,
        // استخراج ID من الـ URL إن وجد
        resourceType: route.resourceType,
      };
    }
  }

  // Default: Deny - مسار غير معرف = محمي
  return {
    level: 'authenticated',
    pattern: new RegExp(`^${pathname}$`),
  };
}

/**
 * استخراج معرف المورد من الـ URL
 */
export function extractResourceId(pathname: string, pattern: RegExp): string | null {
  const match = pathname.match(pattern);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * التحقق مما إذا كان المسار عاماً
 */
export function isPublicRoute(pathname: string, method: string): boolean {
  const protection = getRouteProtection(pathname, method);
  return protection?.level === 'public';
}

/**
 * التحقق مما إذا كان المسار يتطلب صلاحية Admin
 */
export function isAdminRoute(pathname: string, method: string): boolean {
  const protection = getRouteProtection(pathname, method);
  return protection?.level === 'admin';
}

/**
 * التحقق مما إذا كان المسار يتطلب ملكية المورد
 */
export function isOwnerRoute(pathname: string, method: string): boolean {
  const protection = getRouteProtection(pathname, method);
  return protection?.level === 'owner';
}
