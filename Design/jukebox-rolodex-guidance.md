# Jukebox “Rolodex” (3D rotating card viewer) — Implementation Guide

This guide shows how to take the **track cards you already have** (each card holds an MP3 link and plays on click) and display them inside your **jukebox graphic** as a rotating, “rolodex / coverflow” style viewer.

It focuses on a **React** front-end (works in Electron or a normal localhost dev server) and gives you **two proven approaches**:

1. **Swiper Coverflow** (fastest, production-stable)
2. **Framer Motion / Motion.dev coverflow** (more “custom feel” and animation control)

You can start with Swiper (minimum time-to-wow), then switch later if you want full control.

---

## What you’re building

- A **RolodexViewport** that visually displays *N* track cards in a 3D coverflow ring
- A **selected card** in the middle (front-most) that plays when clicked
- Optional: next/prev controls or mousewheel/drag
- It’s **mounted inside your jukebox image** as an overlay, so it looks “embedded” in the cabinet.

---

## Assumptions about your current app

From your original ask, you already have:
- A “card” UI where you paste an MP3 URL and click to play
- A mapping concept like `A3`, `B7` → track URL/title (even if it’s in-progress)

If you haven’t built the mapping yet, keep it simple at first:
```js
const tracks = [
  { code: "A1", title: "Track 1", url: "https://..." },
  { code: "A2", title: "Track 2", url: "https://..." },
  // ...
];
```

(That aligns with the original requirement in your doc.) fileciteturn0file0

---

## Step 1 — Create a “TrackCard” that can render anywhere

Make your card purely presentational so it can be used both:
- in your existing list UI
- in the rolodex carousel slides

**`src/components/TrackCard.jsx`**
```jsx
export default function TrackCard({ track, isActive, onPlay }) {
  return (
    <button
      type="button"
      onClick={() => onPlay(track)}
      className={[
        "trackCard",
        isActive ? "trackCard--active" : ""
      ].join(" ")}
      title={`${track.code}: ${track.title}`}
    >
      <div className="trackCard__code">{track.code}</div>
      <div className="trackCard__title">{track.title}</div>
      <div className="trackCard__hint">Click to play</div>
    </button>
  );
}
```

**`src/components/trackCard.css`**
```css
.trackCard {
  width: 220px;
  height: 140px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(6px);
  color: white;
  display: grid;
  gap: 6px;
  padding: 14px;
  cursor: pointer;
  text-align: left;
  user-select: none;
}
.trackCard--active {
  outline: 2px solid rgba(255,255,255,0.9);
}
.trackCard__code {
  font-weight: 800;
  letter-spacing: 0.04em;
  opacity: 0.9;
}
.trackCard__title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.1;
}
.trackCard__hint {
  margin-top: auto;
  font-size: 12px;
  opacity: 0.75;
}
```

---

## Option A (recommended first) — Swiper “Coverflow” rolodex

Swiper has a built-in **EffectCoverflow**, which is basically the “rolodex / coverflow” look you want. The official demos show the effect and configuration options. citeturn0search5

### A1) Install Swiper
```bash
npm i swiper
```

### A2) Build the carousel component

**`src/components/RolodexSwiper.jsx`**
```jsx
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Keyboard, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";

import TrackCard from "./TrackCard";

export default function RolodexSwiper({ tracks, activeIndex, onActiveIndexChange, onPlay }) {
  return (
    <div className="rolodex">
      <Swiper
        modules={[EffectCoverflow, Keyboard, Mousewheel]}
        effect="coverflow"
        centeredSlides
        slidesPerView="auto"
        grabCursor
        keyboard={{ enabled: true }}
        mousewheel={{ forceToAxis: true }}
        coverflowEffect={{
          rotate: 30,
          stretch: 0,
          depth: 160,
          modifier: 1.2,
          slideShadows: false,
        }}
        onSlideChange={(swiper) => onActiveIndexChange(swiper.activeIndex)}
        initialSlide={activeIndex}
      >
        {tracks.map((t, idx) => (
          <SwiperSlide key={t.code} style={{ width: "240px" }}>
            <TrackCard track={t} isActive={idx === activeIndex} onPlay={onPlay} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
```

**`src/components/rolodex.css`**
```css
.rolodex {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}
.rolodex .swiper {
  width: 100%;
  height: 100%;
}
.rolodex .swiper-slide {
  display: grid;
  place-items: center;
}
```

> Reference examples exist for React + Swiper coverflow (including a working sandbox). citeturn0search2

### A3) Wire it to your audio player state

In your top-level component (where your audio element / player logic lives):

```jsx
import { useMemo, useState } from "react";
import RolodexSwiper from "./components/RolodexSwiper";

function App() {
  const tracks = useMemo(() => [
    { code: "A1", title: "Track 1", url: "https://..." },
    { code: "A2", title: "Track 2", url: "https://..." },
    // ...
  ], []);

  const [activeIndex, setActiveIndex] = useState(0);

  function playTrack(track) {
    // Use your existing play logic here:
    // audioRef.current.src = track.url; audioRef.current.play();
    console.log("Play", track);
  }

  return (
    <RolodexSwiper
      tracks={tracks}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      onPlay={playTrack}
    />
  );
}
```

---

## Option B — Motion.dev / Framer Motion “coverflow” (more control)

If you want a more custom “rolodex” feel (snappier, different easing, different spacing), Motion.dev publishes a React coverflow carousel example you can adapt. citeturn0search1

High-level approach:
- Store an `activeIndex`
- Render cards in a row
- Use motion transforms based on `(index - activeIndex)`:
  - translateX, rotateY, scale, zIndex, blur

This is more code than Swiper, but gives you total control over:
- how fast cards rotate
- how “deep” the 3D perspective is
- whether it loops like a ring

If you want, I can generate a drop-in component for your exact card size + jukebox window dimensions.

---

## Step 2 — Mount the rolodex inside your jukebox graphic

### B1) Use an image + overlay container

Place your jukebox image in `public/jukebox.png` (or `src/assets`).

**`src/components/JukeboxFrame.jsx`**
```jsx
export default function JukeboxFrame({ children }) {
  return (
    <div className="jukeboxFrame">
      <img className="jukeboxFrame__img" src="/jukebox.png" alt="Jukebox" draggable={false} />

      {/* This is your “window” cutout where the rolodex appears */}
      <div className="jukeboxFrame__window">
        {children}
      </div>
    </div>
  );
}
```

**`src/components/jukeboxFrame.css`**
```css
.jukeboxFrame {
  position: relative;
  width: min(900px, 95vw);
  margin: 0 auto;
  border-radius: 18px;
  overflow: hidden;
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.14);
}
.jukeboxFrame__img {
  width: 100%;
  display: block;
}
.jukeboxFrame__window {
  position: absolute;

  /* TUNE THESE TO MATCH YOUR IMAGE */
  left: 12%;
  top: 18%;
  width: 76%;
  height: 26%;

  /* optional “glass” effect */
  background: rgba(0,0,0,0.18);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  backdrop-filter: blur(4px);
  overflow: hidden;
}
```

### B2) Put the rolodex inside the frame
```jsx
import JukeboxFrame from "./components/JukeboxFrame";
import RolodexSwiper from "./components/RolodexSwiper";

<JukeboxFrame>
  <RolodexSwiper
    tracks={tracks}
    activeIndex={activeIndex}
    onActiveIndexChange={setActiveIndex}
    onPlay={playTrack}
  />
</JukeboxFrame>
```

### B3) Tune the “window” position quickly
Open devtools and tweak:
- `left`, `top`, `width`, `height`
until the carousel sits perfectly inside the jukebox’s “title strip” or “screen” area.

Tip: temporarily set the window background to a bright color to locate it, then revert:
```css
background: rgba(0, 255, 0, 0.25);
```

---

## Step 3 — Connect rolodex selection to your A3/B7 mapping (optional but “jukebox authentic”)

If you want the carousel to show only *assigned* codes (or highlight empties):

### Suggested structure
```js
const assignments = {
  A1: { title: "Song 1", url: "https://..." },
  B7: { title: "Song 2", url: "https://..." }
};
```

Convert to carousel array:
```js
const tracks = Object.entries(assignments).map(([code, t]) => ({
  code,
  ...t
}));
```

To keep a stable order, sort:
```js
tracks.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
```

---

## Step 4 — UX upgrades that make it feel “real”

### 1) Add “Next / Prev” chrome buttons
Put small arrows on the jukebox panel (or below it) to call `swiper.slideNext()` / `swiper.slidePrev()`.

### 2) Keyboard shortcuts
- Left/Right arrows → switch card
- Enter → play selected
Swiper already supports keyboard control (enabled above).

### 3) Snap-to-play (optional)
If you want it to play automatically when the center card changes:
- call `playTrack(tracks[activeIndex])` in an effect when `activeIndex` changes
- add a toggle (“Auto-play on selection”) so it’s not annoying.

### 4) Drag + inertia
Swiper gives this out of the box.

---

## Debug checklist

- **Audio won’t play**: browser may require a user gesture; ensure play is triggered by click (not auto-play) at first.
- **CORS on MP3 URLs**: some hosts block audio playback. Test with a known good direct MP3 file URL.
- **Cards look squished**: set `SwiperSlide` width (e.g. `240px`) and ensure the window container has enough height.
- **3D looks flat**: bump `depth` and `rotate` in `coverflowEffect`.

---

## Where your YouTube “rolodex” reference fits

The linked YouTube video is a *physical* rolodex flip-through (handmade cards), but the key digital equivalent is the **coverflow / rotating card stack** interaction you’re aiming for. citeturn0search0  
Swiper’s coverflow effect and Motion’s coverflow example are the closest “UI analogs” for that feel. citeturn0search5turn0search1

---

## If you want a true “rotating ring” (like cards orbiting a spindle)

Coverflow is the fastest win, but if you specifically want a *circular* rolodex (ring) where cards wrap around in a loop:
- use a 3D carousel component/library, or
- implement a ring with CSS `rotateY()` and `translateZ()` per card index.

A small React library exists for 3D carousel-style interactions (good for prototyping). citeturn0search4  
(If you go this route, tell me your exact number of cards + desired ring radius, and I’ll generate the math-based version.)

---

## Minimal integration plan (recommended order)

1. Add **JukeboxFrame** with an overlay “window”.
2. Mount **RolodexSwiper** inside it using your existing track list.
3. Hook `onPlay(track)` to your existing audio player.
4. Replace the hardcoded `tracks` with your real `assignments`/code mapping.
5. Add next/prev buttons, polish visuals.

---

## Next: I can tailor this to your exact layout

If you share:
- your current React component name where the track cards live,
- the jukebox image you’re using (or its dimensions),
- how many slots you want (e.g. A–F x 1–10),

…I can adjust the overlay window and give you a drop-in component that matches your cabinet art perfectly.
