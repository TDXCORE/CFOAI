import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Minimal middleware for debugging
// Only handle essential functionality to isolate the error

export async function middleware(request: NextRequest) {
  try {
    // Minimal middleware - just pass through with basic logging
    console.log(`Middleware processing: ${request.nextUrl.pathname}`);
    
    // Basic CSRF protection only for POST requests
    if (request.method === 'POST' && !request.headers.has('next-action')) {
      const token = request.headers.get('x-csrf-token');
      if (!token && request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'CSRF token required' }, { status: 403 });
      }
    }
    
    const response = NextResponse.next();
    
    // Add basic correlation ID if possible
    try {
      response.headers.set('x-request-id', Date.now().toString());
    } catch (e) {
      // Ignore if headers can't be set
    }
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|api/*).*)'],
};
