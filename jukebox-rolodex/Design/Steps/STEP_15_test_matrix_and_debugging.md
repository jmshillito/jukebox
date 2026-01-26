# Step 15 — Test Matrix + Debugging

## Goal
Verify responsive alignment across localhost and Vercel/mobile.

## Tests

### A) Desktop browser resize
- Slowly resize width from narrow to wide
- Confirm:
  - Background never distorts
  - Cards remain aligned with the image

### B) Chrome mobile emulation
DevTools → Toggle device toolbar (Ctrl+Shift+M)
- Test iPhone + Android profiles
- Confirm card positions match expectation

### C) Real phone (Vercel)
Open your Vercel URL on the phone
- Confirm the same alignment

## Debugging tips
1. If cards drift:
   - Ensure cards are inside `.stage` and `.cards`
   - Ensure `.cards` is `position: absolute; inset: 0;`
2. If image distorts:
   - Ensure `.stage-bg` uses `object-fit: cover;`
3. If everything is too small on desktop:
   - Increase `.stage` max width (e.g. 520px)
4. If you must show the entire jukebox image:
   - Replace `object-fit: cover` with `contain` (accept letterboxing)

## Stop condition
Once alignment looks good on:
- Desktop + mobile emulation + phone
You can proceed to refine spacing (tune only percentages, not px positioning).
