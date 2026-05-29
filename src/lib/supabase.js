import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep the app running in dev while warning about missing env config.
  // Auth/data operations will fail until both env vars are set.
  console.warn('Supabase env vars are missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  supabaseUrl ?? 'https://replace-me.supabase.co',
  supabaseAnonKey ?? 'replace-me',
)
