# Step 4: Supabase Database Setup


Supabase is used ONLY for metadata.

Create table:
- songs (id, owner_id, title, artist, r2_key)

Important rules:
- Never store MP3 blobs in Supabase
- Use the SERVICE ROLE key only on the server
- Ownership checks happen in API routes

