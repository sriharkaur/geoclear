import { Pool } from 'pg'

// Singleton prevents connection leaks under load.
// Initialize once at module level — never inside request handlers.
const globalForPool = global as unknown as { pool: Pool }

export const pool = globalForPool.pool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: process.env.NODE_ENV === 'production' ? 20 : 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

if (process.env.NODE_ENV !== 'production') globalForPool.pool = pool
