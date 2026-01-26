# Step 14 — Update CSS (Cards Grid Alignment)

## Goal
Make cards stay aligned with the background by placing them in an overlay grid that scales with the stage.

## Actions
Add/merge these CSS rules:

```css
.cards {
  position: absolute;
  inset: 0;
  z-index: 1;

  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  /* Use % so spacing scales with the stage/image */
  padding: 12% 6% 0 6%;
  align-content: start;
}

/* Optional: card sizing/text scaling */
.card, .song-card, .button-card {
  font-size: clamp(12px, 2.5vw, 16px);
}
```

## Adjustments you can tune
- Increase/decrease top padding to move the grid up/down:
  - `padding-top: 10%` vs `14%`
- Adjust `gap` for spacing between cards
- Change `width: min(100vw, 420px)` in `.stage` if desktop needs bigger/smaller

## Stop condition
Resize the browser window:
- The cards should remain in the same “place” on the jukebox
- Mobile emulation should match desktop proportions
