# Step 6: Vercel Serverless Functions


Add these endpoints under /api:

- POST /api/r2-upload-url
- POST /api/songs
- GET  /api/library
- GET  /api/r2-play-url

Each function:
- Verifies Clerk JWT
- Enforces ownership
- Returns JSON only

