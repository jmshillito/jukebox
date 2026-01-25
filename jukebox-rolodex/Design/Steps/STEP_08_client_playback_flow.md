# Step 8: Client Playback Flow


Playback flow:

1. JS requests /api/r2-play-url?songId=...
2. Server verifies ownership
3. Server returns signed GET URL
4. <audio src=SIGNED_URL> plays the track

Signed URLs expire automatically.

