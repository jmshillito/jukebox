const { GetObjectCommand, getSignedUrl, getR2Bucket, getS3Client, getSupabase, sendJson, requireAuth } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try{
    const songId = req.query?.songId || req.query?.id;
    if (!songId) return sendJson(res, 400, { error: "songId is required" });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("songs")
      .select("id, r2_key")
      .eq("id", songId)
      .eq("owner_id", userId)
      .single();

    if (error || !data) return sendJson(res, 404, { error: "Song not found" });

    const s3 = getS3Client();
    const bucket = getR2Bucket();
    if (!bucket) return sendJson(res, 500, { error: "Missing R2 bucket env" });

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: data.r2_key,
      }),
      { expiresIn: 60 }
    );

    return sendJson(res, 200, { url, key: data.r2_key });
  }catch(err){
    return sendJson(res, 500, { error: "Failed to create play URL" });
  }
};
