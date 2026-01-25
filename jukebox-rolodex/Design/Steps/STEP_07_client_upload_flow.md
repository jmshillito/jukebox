# Step 7: Client Upload Flow


Upload flow (browser):

1. User picks MP3
2. JS requests /api/r2-upload-url
3. Server returns signed PUT URL
4. Browser uploads MP3 directly to R2
5. JS saves metadata via /api/songs

The server NEVER sees the MP3 file itself.

