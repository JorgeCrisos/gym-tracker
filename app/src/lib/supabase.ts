import { createClient } from '@supabase/supabase-js'

// Legacy anon client key: safe to ship in a browser. Database access is protected by RLS.
const supabaseUrl = 'https://hozoeaitandlypoqzlgf.supabase.co'
const supabasePublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvem9lYWl0YW5kbHlwb3F6bGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNjI5MzksImV4cCI6MjEwNTYzODkzOX0.HOKssNWyMSeZIEeaSdYFpqonGcMPm8ZNkdgzu1B0fg0'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
