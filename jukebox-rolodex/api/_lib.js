const jwt = require("jsonwebtoken");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { createClient } = require("@supabase/supabase-js");

function normalizeClerkPublicKey(value){
  if (!value) return null;
  const trimmed = value.replace(/\\n/g, "\n").trim();
  if (trimmed.includes("BEGIN PUBLIC KEY")) return trimmed;
  const chunks = trimmed.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${chunks.join("\n")}\n-----END PUBLIC KEY-----`;
}

const clerkPublicKey = normalizeClerkPublicKey(process.env.CLERK_JWT_VERIFICATION_KEY);

let supabase = null;
let s3 = null;

function sendJson(res, status, payload){
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function getSupabase(){
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  supabase = createClient(url, key, { auth: { persistSession: false } });
  return supabase;
}

function getS3Client(){
  if (s3) return s3;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("Missing R2 env");
  s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return s3;
}

async function readJson(req){
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
    });
  });
}

function getBearerToken(req){
  const auth = req.headers.authorization || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function verifyToken(token){
  if (!clerkPublicKey) throw new Error("Missing Clerk JWT verification key");
  return jwt.verify(token, clerkPublicKey, { algorithms: ["RS256"] });
}

async function requireAuth(req, res){
  try{
    const token = getBearerToken(req);
    if (!token) {
      sendJson(res, 401, { error: "Missing authorization token" });
      return null;
    }
    const payload = verifyToken(token);
    if (!payload?.sub) {
      sendJson(res, 401, { error: "Invalid token" });
      return null;
    }
    return payload.sub;
  }catch(err){
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
}

module.exports = {
  PutObjectCommand,
  GetObjectCommand,
  getSignedUrl,
  getSupabase,
  getS3Client,
  readJson,
  sendJson,
  requireAuth,
};
