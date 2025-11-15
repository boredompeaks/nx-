import { createClient } from '@supabase/supabase-js';
export async function attachUser(req, _res, next) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        const authHeader = req.headers['authorization'];
        if (!supabaseUrl || !anon || !authHeader) {
            ;
            req.userId = null;
            return next();
        }
        const client = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
        const { data, error } = await client.auth.getUser();
        if (error) {
            ;
            req.userId = null;
        }
        else {
            ;
            req.userId = data.user?.id || null;
        }
        next();
    }
    catch {
        ;
        req.userId = null;
        next();
    }
}
export function requireAuth(req, res, next) {
    if (!req.userId) {
        return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED', timestamp: new Date().toISOString(), path: req.path } });
    }
    next();
}
