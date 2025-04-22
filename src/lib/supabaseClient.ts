import { createClient } from '@supabase/supabase-js'

// Ensure environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Missing environment variable: SUPABASE_URL")
}
if (!supabaseServiceKey) {
  throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY")
}

// Initialize the Supabase client for server-side usage
// We use the Service Role Key for API routes to bypass RLS if needed
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'competitors-analysis' },
  auth: {
    // Important: Disable automatic token refresh and session persistence for server-side
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabaseAdmin; 