# Step 11 — Responsive Layout Goal (Background + Overlays)

## Objective
Fix the issue where `jukebox.png` looks distorted and the overlay cards drift on different screens (desktop localhost vs mobile/Vercel).

## Root cause
The background image scales based on the viewport, while the overlay cards are positioned/scaled differently (often px-based or viewport-based). This causes misalignment.

## Fix strategy
Create a single **stage container** that:
- Maintains the same aspect ratio as `jukebox.png`
- Contains BOTH the background image and the overlay layer
- Positions cards relative to the stage (percent/grid), not the viewport

## Deliverables in this step series
- Update `index.html` to wrap background + overlays in `.stage`
- Update CSS to enforce `aspect-ratio`, `object-fit: cover`, and grid layout
- Validate on desktop and in mobile emulation
