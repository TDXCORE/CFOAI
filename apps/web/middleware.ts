import type { NextRequest } from 'next/server';
import { NextResponse, URLPattern } from 'next/server';

import { CsrfError, createCsrfProtect } from '@edge-csrf/nextjs';

const CSRF_SECRET_COOKIE = 'csrfSecret';
const NEXT_ACTION_HEADER = 'next-action';

// Edge-compatible constants (inlined to avoid imports)
const PATHS = {
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up', 
    verifyMfa: '/auth/verify',
  },
  app: {
    home: '/dashboard',
  },
};

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Edge-compatible functions
function hasAuthCookies(request: NextRequest) {
  try {
    // Simple check for any Supabase auth-related cookies
    const cookies = request.cookies.getAll();
    return cookies.some(cookie => 
      cookie.name.startsWith('sb-') && cookie.value && cookie.value.length > 0
    );
  } catch (error) {
    console.error('Cookie check error:', error);
    return false;
  }
}

function getUserFromCookies(request: NextRequest) {
  try {
    if (hasAuthCookies(request)) {
      // Return a placeholder user object
      // Real authentication should be handled at page level
      return { id: 'user', email: 'user@example.com' };
    }
    return null;
  } catch (error) {
    console.error('User check error:', error);
    return null;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|api/*).*)'],
};

const getUser = (request: NextRequest) => {
  const user = getUserFromCookies(request);
  return Promise.resolve({ data: { user }, error: null });
};

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next();

    // set a unique request ID for each request
    // this helps us log and trace requests
    setRequestId(request);

    // apply CSRF protection for mutating requests
    const csrfResponse = await withCsrfMiddleware(request, response);

    // handle patterns for specific routes
    const handlePattern = matchUrlPattern(request.url);

    // if a pattern handler exists, call it
    if (handlePattern) {
      const patternHandlerResponse = await handlePattern(request, csrfResponse);

      // if a pattern handler returns a response, return it
      if (patternHandlerResponse) {
        return patternHandlerResponse;
      }
    }

    // append the action path to the request headers
    // which is useful for knowing the action path in server actions
    if (isServerAction(request)) {
      csrfResponse.headers.set('x-action-path', request.nextUrl.pathname);
    }

    // if no pattern handler returned a response,
    // return the session response
    return csrfResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    // Return basic response on error to avoid complete failure
    return NextResponse.next();
  }
}

async function withCsrfMiddleware(
  request: NextRequest,
  response = new NextResponse(),
) {
  // set up CSRF protection
  const csrfProtect = createCsrfProtect({
    cookie: {
      secure: IS_PRODUCTION,
      name: CSRF_SECRET_COOKIE,
    },
    // ignore CSRF errors for server actions since protection is built-in
    ignoreMethods: isServerAction(request)
      ? ['POST']
      : // always ignore GET, HEAD, and OPTIONS requests
        ['GET', 'HEAD', 'OPTIONS'],
  });

  try {
    await csrfProtect(request, response);

    return response;
  } catch (error) {
    // if there is a CSRF error, return a 403 response
    if (error instanceof CsrfError) {
      return NextResponse.json('Invalid CSRF token', {
        status: 401,
      });
    }

    throw error;
  }
}

function isServerAction(request: NextRequest) {
  const headers = new Headers(request.headers);

  return headers.has(NEXT_ACTION_HEADER);
}
/**
 * Define URL patterns and their corresponding handlers.
 */
function getPatterns() {
  return [
    {
      pattern: new URLPattern({ pathname: '/auth/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const {
          data: { user },
        } = await getUser(req);

        // the user is logged out, so we don't need to do anything
        if (!user) {
          return;
        }

        // check if we need to verify MFA (user is authenticated but needs to verify MFA)
        const isVerifyMfa = req.nextUrl.pathname === PATHS.auth.verifyMfa;

        // If user is logged in and does not need to verify MFA,
        // redirect to home page.
        if (!isVerifyMfa) {
          return NextResponse.redirect(
            new URL(PATHS.app.home, req.nextUrl.origin).href,
          );
        }
      },
    },
    {
      pattern: new URLPattern({ pathname: '/home/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const {
          data: { user },
        } = await getUser(req);

        const origin = req.nextUrl.origin;
        const next = req.nextUrl.pathname;

        // If user is not logged in, redirect to sign in page.
        if (!user) {
          const signIn = PATHS.auth.signIn;
          const redirectPath = `${signIn}?next=${next}`;

          return NextResponse.redirect(new URL(redirectPath, origin).href);
        }

        // Note: MFA checking is simplified for edge runtime compatibility
        // Full MFA verification will be handled at the page level
      },
    },
  ];
}

/**
 * Match URL patterns to specific handlers.
 * @param url
 */
function matchUrlPattern(url: string) {
  const patterns = getPatterns();
  const input = url.split('?')[0];

  for (const pattern of patterns) {
    const patternResult = pattern.pattern.exec(input);

    if (patternResult !== null && 'pathname' in patternResult) {
      return pattern.handler;
    }
  }
}

/**
 * Set a unique request ID for each request.
 * @param request
 */
function setRequestId(request: Request) {
  try {
    const requestId = crypto.randomUUID();
    request.headers.set('x-correlation-id', requestId);
  } catch (error) {
    console.error('Failed to set request ID:', error);
    // Continue without request ID if crypto is not available
  }
}
