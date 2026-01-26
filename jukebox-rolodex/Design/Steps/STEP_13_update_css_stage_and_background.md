# Step 13 — Update CSS (Stage + Background)

## Goal
Prevent image distortion and make the image scale consistently across desktop/mobile.

## Actions
Add/merge these CSS rules into your main stylesheet (e.g., `rolodex_AH.css`).

```css
.stage {
  position: relative;
  width: min(100vw, 420px);   /* cap width on desktop; adjust later */
  aspect-ratio: 9 / 16;       /* IMPORTANT: match your jukebox.png ratio */
  margin: 0 auto;
}

.stage-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;          /* prevents distortion */
  object-position: top center;
  z-index: 0;
}
```

## If you need full-screen
If you want the stage vertically centered or full height:

```css
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
}
```

## Stop condition
Reload and confirm:
- The image is NOT stretched (no distortion)
- The stage keeps a stable shape when resizing the browser window
