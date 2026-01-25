# Step 1: Architecture Overview


Goal: Keep the app **static**, add cloud persistence safely.

You will use:
- Static HTML/CSS/JS (existing jukebox-rolodex)
- Clerk for user sign-in
- Supabase Postgres for song metadata only
- Cloudflare R2 for MP3 storage
- Vercel Serverless Functions under /api

Nothing is uploaded directly to your server:
- Browser uploads MP3s straight to R2 via signed URLs
- Your server only issues short-lived permissions

