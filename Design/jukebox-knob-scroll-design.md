# Jukebox UI with 8 Visible Cards and Two Scroll Knobs (No Rolodex)

This updates the design so you **do not use a rolodex/coverflow**. Instead you render **8 visible cards** (4 left column + 4 right column) on top of your jukebox image, with **two independent “knobs”** to scroll each column up/down through a larger “virtual” card set.

Your graphic is at:

- `/home/johns/projects/Portfolio/public/jukebox.png`

You already have:
- a localhost interface that can create/play cards from an MP3 link
- a background image that shows **8 card windows**
- buttons labeled **A–J** and **1–9** (per the updated image)

---

## 1) Card Indexing Rules (How the virtual deck maps to the 8 visible slots)

### The virtual deck
You have a virtual grid of selections:

- Letters: **A → J** (10 letters)
- Numbers: **1 → 9** (9 numbers)

So total virtual cards = **10 × 9 = 90** cards:
- A1..A9, B1..B9, …, J1..J9

### How the 8 visible cards are filled
At any time, you show **8 cards** using a *single global offset* into the virtual deck, filling the visible slots in this order:

1. Left slot 1
2. Right slot 1
3. Left slot 2
4. Right slot 2
5. Left slot 3
6. Right slot 3
7. Left slot 4
8. Right slot 4

This yields the pattern you described:

- Start:
  - Left1 = **A1**
  - Right1 = **A2**
  - Left2 = **A3**
  - Right2 = **A4**
  - Left3 = **A5**
  - Right3 = **A6**
  - Left4 = **A7**
  - Right4 = **A8**

- Next page-like shift (advance by 8):
  - Left1 = **A9**
  - Right1 = **B1**
  - Left2 = **B2**
  - Right2 = **B3**
  - Left3 = **B4**
  - Right3 = **B5**
  - Left4 = **B6**
  - Right4 = **B7**

…and so on.

---

## 2) The Key Change: Two Independent Knobs Control Only Their Column

You want:
- **Left knob** scrolls **only the left column slots** (Left1..Left4)
- **Right knob** scrolls **only the right column slots** (Right1..Right4)

That means you should maintain **two independent offsets**:

- `leftOffset`: which virtual card is currently shown in **Left1**
- `rightOffset`: which virtual card is currently shown in **Right1**

Then the visible mapping becomes:

- Left column:
  - Left1 = deck[leftOffset + 0]
  - Left2 = deck[leftOffset + 1]
  - Left3 = deck[leftOffset + 2]
  - Left4 = deck[leftOffset + 3]

- Right column:
  - Right1 = deck[rightOffset + 0]
  - Right2 = deck[rightOffset + 1]
  - Right3 = deck[rightOffset + 2]
  - Right4 = deck[rightOffset + 3]

Where `deck[i]` is a virtual card in the sequence A1..A9,B1..B9,...,J9.

### Important implication
This is **not** the same as the alternating A1/A2/A3… pattern *unless* you initialize offsets like:

- `leftOffset = 0`  → A1
- `rightOffset = 1` → A2

That gives your starting arrangement:
- left = A1..A4
- right = A2..A5

But you originally described “alternating” left/right through 8 items. With *independent column scrolling*, you’ll get an arrangement that is consistent and easy to reason about:

- Left column shows 4 consecutive deck items
- Right column shows 4 consecutive deck items

And each knob moves *its own* column up/down.

If you **must preserve** the exact alternating fill pattern **and** still let knobs move independently, you can do it—but it’s more complex (because every other item belongs to a different column). The simpler (recommended) approach is the two-offset column model above.

---

## 3) Deck Construction (A1..J9 in a single array)

Create a function to build the deck in the correct order:

- A1..A9
- B1..B9
- ...
- J1..J9

In JS/TS:

```ts
type CardKey = { letter: string; number: number; id: string };

const letters = "ABCDEFGHIJ".split("");
const numbers = Array.from({ length: 9 }, (_, i) => i + 1);

export function buildDeck(): CardKey[] {
  const deck: CardKey[] = [];
  for (const letter of letters) {
    for (const num of numbers) {
      deck.push({ letter, number: num, id: `${letter}${num}` });
    }
  }
  return deck;
}
```

---

## 4) State Model

Minimum UI state:

```ts
type JukeboxState = {
  leftOffset: number;   // index into deck for Left1
  rightOffset: number;  // index into deck for Right1
  // optionally: selected card, playing card, etc.
};
```

Initialize:

```ts
const deck = buildDeck();
const [leftOffset, setLeftOffset] = useState(0);  // A1
const [rightOffset, setRightOffset] = useState(1); // A2
```

---

## 5) Bounds, Wrapping, and “Feel”

Decide whether turning the knob:
1) **wraps** around at ends (circular), or
2) **clamps** at ends (stops)

### Clamp (recommended first)
Each column shows 4 cards, so max offset is:

- `maxOffset = deck.length - 4`

Clamp:

```ts
function clampOffset(v: number) {
  return Math.max(0, Math.min(v, deck.length - 4));
}
```

### Wrap (later if desired)
```ts
function wrapOffset(v: number) {
  const max = deck.length - 4;
  if (v < 0) return max;
  if (v > max) return 0;
  return v;
}
```

---

## 6) Knob Turning → Offset Changes

### Choose an interaction model
You have two easy options:

**Option A: Mouse wheel / trackpad scroll on each knob**
- Easiest to implement and test quickly
- Great for desktop dev

**Option B: Click + drag to rotate knob**
- More “realistic”
- Slightly more code (angle tracking)

Start with **Option A**, then upgrade to **Option B**.

---

## 7) Rendering: Overlay Cards on the Jukebox Image

### Layout strategy
Use a wrapper with `position: relative;`:

- background `<img src="/jukebox.png" />`
- absolutely positioned:
  - 8 card slots (divs)
  - left knob hit-area
  - right knob hit-area

Example structure:

```tsx
<div className="jukebox">
  <img src="/jukebox.png" className="jukebox-bg" />

  {/* left column cards */}
  <CardSlot style={slotStyles.left1} card={deck[leftOffset + 0]} />
  <CardSlot style={slotStyles.left2} card={deck[leftOffset + 1]} />
  <CardSlot style={slotStyles.left3} card={deck[leftOffset + 2]} />
  <CardSlot style={slotStyles.left4} card={deck[leftOffset + 3]} />

  {/* right column cards */}
  <CardSlot style={slotStyles.right1} card={deck[rightOffset + 0]} />
  <CardSlot style={slotStyles.right2} card={deck[rightOffset + 1]} />
  <CardSlot style={slotStyles.right3} card={deck[rightOffset + 2]} />
  <CardSlot style={slotStyles.right4} card={deck[rightOffset + 3]} />

  {/* knob hit-areas */}
  <Knob side="left"  style={knobStyles.left}  onScroll={delta => setLeftOffset(o => clampOffset(o + delta))} />
  <Knob side="right" style={knobStyles.right} onScroll={delta => setRightOffset(o => clampOffset(o + delta))} />
</div>
```

Where each `slotStyles.*` is an `{ left, top, width, height }` matched to the card windows in your PNG.

---

## 8) Implementing the Knob Component (Scroll-first)

A simple wheel-driven knob hit-area:

```tsx
function Knob({
  side,
  style,
  onScroll,
}: {
  side: "left" | "right";
  style: React.CSSProperties;
  onScroll: (delta: number) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        ...style,
        cursor: "ns-resize",
      }}
      onWheel={(e) => {
        e.preventDefault();
        // wheel down = positive, wheel up = negative
        const step = e.deltaY > 0 ? 1 : -1;
        onScroll(step);
      }}
    />
  );
}
```

Then later you can replace `onWheel` with drag-rotation, while keeping the same `onScroll(step)` interface.

---

## 9) “Turning” Animation (Visual feedback)

Even if you don’t actually rotate the bitmap knob yet, you can show:
- a subtle “pressed” shadow
- small rotation of a knob overlay element (optional)

If you do want to rotate a knob overlay (CSS):

```tsx
<div style={{ transform: `rotate(${angleDeg}deg)` }} />
```

But since the knob is baked into the PNG right now, the *hit-area* alone is enough to get the behavior working.

---

## 10) Hooking Cards to Your MP3 Playback

Each visible card should carry:
- `id` like `"B7"`
- optional metadata: title/artist/mp3Url

Then clicking the card triggers your existing play logic:

```tsx
function CardSlot({ card, style }: { card: CardKey; style: React.CSSProperties }) {
  return (
    <button
      style={{ position: "absolute", ...style }}
      onClick={() => playCard(card.id)}
      className="card-slot"
      title={card.id}
    >
      <div className="card-label">{card.id}</div>
    </button>
  );
}
```

Where `playCard("B7")` looks up the MP3 URL.

---

## 11) Optional: Keep Columns “Paired” Like the Old Alternating View

If you want the right column always to be “the next item after left” (like A1 left, A2 right), you can enforce:

- `rightOffset = leftOffset + 1`

…but then the right knob should either:
- be disabled, or
- shift both offsets together

Since you explicitly want **independent** knobs, stick with two offsets.

---

## 12) Testing Checklist

- [ ] Deck is in the order A1..A9, B1..B9, …, J9
- [ ] Initial visible cards match desired start
- [ ] Left knob changes only left column cards
- [ ] Right knob changes only right column cards
- [ ] Scrolling clamps correctly (no undefined cards)
- [ ] Clicking a card plays the expected MP3
- [ ] Card overlay positions line up with the 8 window rectangles in `jukebox.png`

---

## 13) Next Step: Measuring Slot Coordinates

To get exact positioning:
1. Open `jukebox.png` in the browser
2. Overlay temporary divs with borders (debug mode)
3. Adjust top/left/width/height until aligned
4. Save coordinates in `slotStyles`

Example debug CSS:

```css
.card-slot {
  border: 2px solid rgba(255,0,0,0.35);
  background: rgba(255,255,255,0.02);
}
```

---

## Appendix: If You Really Want the Original Alternating Mapping

If you want the **single alternating sequence** (A1 left, A2 right, A3 left…) *and* independent knob movement, you need:
- one “global index” per column that advances by 2 each step
- careful handling when crossing letter boundaries

That can be done, but the two-offset consecutive-column model above will be faster to ship and easier to maintain.

