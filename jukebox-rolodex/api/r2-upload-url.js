const { PutObjectCommand, getSignedUrl, getS3Client, readJson, sendJson, requireAuth } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try{
    const body = await readJson(req);
    const songId = body.songId || body.id;
    const contentType = body.contentType || "audio/mpeg";
    if (!songId) return sendJson(res, 400, { error: "songId is required" });

    const key = `users/${userId}/songs/${songId}.mp3`;
    const s3 = getS3Client();
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 60 }
    );

    return sendJson(res, 200, { url, key });
  }catch(err){
    return sendJson(res, 500, { error: "Failed to create upload URL" });
  }
};
