import { createClient } from '@supabase/supabase-js'

// Ensure environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Add debug logging
console.log("Supabase URL available:", !!supabaseUrl);
console.log("Supabase Key available:", !!supabaseServiceKey);

if (!supabaseUrl) {
  console.error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL")
}
if (!supabaseServiceKey) {
  console.error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

// Initialize the Supabase client for server-side usage
// We use the Service Role Key for API routes to bypass RLS if needed
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: {
    // Important: Disable automatic token refresh and session persistence for server-side
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabaseAdmin;