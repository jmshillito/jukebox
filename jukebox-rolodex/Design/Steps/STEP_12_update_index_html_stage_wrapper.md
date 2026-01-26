# Step 12 — Update index.html (Stage Wrapper)

## Goal
Wrap the background image and your existing A1–A8 cards in a single container so they share the same coordinate system.

## Actions
1. Locate where `jukebox.png` is used (either `<img>` or CSS background).
2. Replace/insert a stage wrapper like this:

```html
<div class="stage">
  <img src="jukebox.png" class="stage-bg" alt="Jukebox" />

  <div class="cards">
    <!-- Move your existing A1–A8 card markup here -->
  </div>
</div>
```

## Notes
- Do NOT change the card HTML inside `.cards` yet—just move it inside.
- Ensure your viewport meta tag exists in `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

## Stop condition
After editing, open the page and confirm:
- You can see the background
- You can see the cards
- Layout may still look off (CSS step comes next)
