import { createClient } from "@supabase/supabase-js";

export const storageClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
// This is your server-side Storage client.

