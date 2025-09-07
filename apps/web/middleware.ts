// Middleware temporarily disabled to isolate the issue
// Next.js 15 + Edge Runtime seems to have compatibility issues

// TODO: Re-enable middleware once compatibility issues are resolved
// For now, authentication and CSRF protection will be handled at page/API level

export const config = {
  // Disable middleware by matching nothing
  matcher: [],
};
