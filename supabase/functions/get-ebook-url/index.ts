import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return new Response("Unauthorized", { status: 401 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user)
    return new Response("Invalid user", { status: 401 });

  const { data, error } = await supabase.storage
    .from("ebooks")
    .createSignedUrl("ebookonline.pdf", 60 * 10);
  
  console.log("Storage query result:", { data, error });
  
  if (error || !data?.signedUrl) {
    console.error("Storage error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Error creating URL" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ url: data.signedUrl }), {
    headers: { "Content-Type": "application/json" },
  });
});
