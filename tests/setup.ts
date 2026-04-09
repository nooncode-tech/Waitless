import '@testing-library/jest-dom'

// Mock Supabase so unit tests don't need a real DB connection
vi.mock('@/lib/supabase', () => {
  // A thenable query builder: all chained methods return `this`,
  // and `then(resolve)` is called by `await`, resolving to { data: [], error: null }.
  const makeBuilder = () => {
    const builder: Record<string, unknown> = {}
    const returnThis = vi.fn(() => builder)
    builder.select = returnThis
    builder.insert = returnThis
    builder.update = returnThis
    builder.upsert = returnThis
    builder.delete = returnThis
    builder.eq = returnThis
    builder.neq = returnThis
    builder.gt = returnThis
    builder.gte = returnThis
    builder.lt = returnThis
    builder.lte = returnThis
    builder.in = returnThis
    builder.is = returnThis
    builder.filter = returnThis
    builder.not = returnThis
    builder.or = returnThis
    builder.order = returnThis
    builder.limit = returnThis
    builder.range = returnThis
    // single() / maybeSingle() devuelven Promise directamente (no usan .then)
    builder.single = vi.fn().mockResolvedValue({ data: null, error: null })
    builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    // Proper thenable: calls resolve() so `await` resolves correctly
    builder.then = vi.fn((resolve: (v: unknown) => void) => {
      resolve({ data: [], error: null })
      return Promise.resolve({ data: [], error: null })
    })
    return builder
  }

  return {
    supabase: {
      from: vi.fn(() => makeBuilder()),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/img.jpg' } }),
        })),
      },
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    },
  }
})

// Mock crypto.randomUUID for offline-queue
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) },
})
