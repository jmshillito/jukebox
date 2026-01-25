const { getSupabase, sendJson, requireAuth } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try{
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, artist, r2_key, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) return sendJson(res, 500, { error: "Database query failed" });
    return sendJson(res, 200, { songs: data || [] });
  }catch(err){
    return sendJson(res, 500, { error: "Server error" });
  }
};
