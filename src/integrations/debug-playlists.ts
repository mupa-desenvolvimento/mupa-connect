
import { supabase } from "./supabase/client";

async function debugPlaylists() {
  console.log("--- DEBUG PLAYLISTS START ---");
  
  try {
    // 1. Get Session
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Auth Session User ID:", session?.user?.id);
    console.log("Auth Session User Email:", session?.user?.email);

    // 2. Query playlists directly (no tenant filter)
    console.log("Querying all playlists (no filter)...");
    const { data: allPlaylists, error: allErr } = await supabase
      .from('playlists')
      .select('id, name, tenant_id')
      .limit(5);
    
    if (allErr) {
      console.error("Error querying all playlists:", allErr);
    } else {
      console.log(`Found ${allPlaylists?.length || 0} playlists total.`);
      allPlaylists?.forEach(p => console.log(` - ID: ${p.id}, Name: ${p.name}, Tenant: ${p.tenant_id}`));
    }

    // 3. Try to query with .or filter like in the hook
    if (session?.user) {
        console.log("Testing .or filter...");
        // Use a dummy tenant ID for test if needed, or just null
        const testTenantId = "f822bf9d-39e9-4726-82f7-c16bf267bc39"; // Stock Center
        const { data: orData, error: orErr } = await supabase
            .from('playlists')
            .select('id, name')
            .or(`tenant_id.eq.${testTenantId},tenant_id.is.null`)
            .limit(5);
            
        if (orErr) {
            console.error("Error with .or filter:", orErr);
        } else {
            console.log(".or filter success. Found:", orData?.length);
        }
    }

  } catch (e) {
    console.error("Debug script failed catch:", e);
  }
  
  console.log("--- DEBUG PLAYLISTS END ---");
}

debugPlaylists();
