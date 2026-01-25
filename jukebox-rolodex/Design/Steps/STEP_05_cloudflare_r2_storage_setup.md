# Step 5: Cloudflare R2 Storage Setup


R2 stores MP3 files privately.

Setup steps:
1. Create R2 bucket (private)
2. Generate access keys
3. Use S3-compatible endpoint

File layout:
users/<clerkUserId>/songs/<songId>.mp3

No public access. Playback only via signed URLs.

