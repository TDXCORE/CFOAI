import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.MICROSOFT_CLIENT_ID = 'test-client-id'
process.env.MICROSOFT_CLIENT_SECRET = 'test-client-secret'
process.env.MICROSOFT_REDIRECT_URI = 'http://localhost:3000/api/auth/callback'

// Mock fetch globally
global.fetch = jest.fn()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useParams() {
    return {
      tenant: 'test-tenant',
    }
  },
  usePathname() {
    return '/dashboard'
  },
}))

// Mock Supabase client
jest.mock('~/lib/supabase/server', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
          order: jest.fn(() => ({
            range: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
    })),
  }),
}))

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})