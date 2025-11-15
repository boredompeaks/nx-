import type { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const authHeader = req.headers['authorization'] as string | undefined
    if (!supabaseUrl || !anon || !authHeader) {
      ;(req as any).userId = null
      return next()
    }
    const client = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } })
    const { data, error } = await client.auth.getUser()
    if (error) {
      ;(req as any).userId = null
    } else {
      ;(req as any).userId = data.user?.id || null
    }
    next()
  } catch {
    ;(req as any).userId = null
    next()
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).userId) {
    return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED', timestamp: new Date().toISOString(), path: req.path } })
  }
  next()
}
