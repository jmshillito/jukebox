const { getSupabase, readJson, sendJson, requireAuth } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try{
    const body = await readJson(req);
    const title = body.title;
    const artist = body.artist || null;
    const r2Key = body.r2_key || body.r2Key;
    const slot = body.slot || null;
    const id = body.id || null;

    if (!title || !r2Key) {
      return sendJson(res, 400, { error: "title and r2_key are required" });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("songs")
      .insert({ id, owner_id: userId, title, artist, r2_key: r2Key, slot })
      .select("id, owner_id, title, artist, r2_key, slot, created_at")
      .single();

    if (error) {
      return sendJson(res, 500, {
        error: "Database insert failed",
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }
    return sendJson(res, 200, { song: data });
  }catch(err){
    return sendJson(res, 500, { error: "Server error" });
  }
};
