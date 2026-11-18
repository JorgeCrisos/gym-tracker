import { createClient } from '@supabase/supabase-js'

// Publishable client key: safe to ship in a browser. Database access is protected by RLS.
const supabaseUrl = 'https://hozoeaitandlypoqzlgf.supabase.co'
const supabasePublishableKey = 'sb_publishable_qQej0RB8b3nnvCu0qTslFQ_WS3CBdu0w'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
