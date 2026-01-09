console.log("rolodex_AH_with_loader_fixed.js loaded ✅");

/* IndexedDB: stores MP3 blobs + titles per slot */
const DB_NAME = "jukeboxRolodex";
const DB_VERSION = 1;
const STORE = "slots";

function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "slot" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbPut(record){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function dbGet(slot){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(slot);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function dbGetAll(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function dbDelete(slot){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(slot);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function dbClearAll(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

function titleFromFilename(name){
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
}

/* Elements */
const hamburger = document.getElementById("hamburger");
const loaderModal = document.getElementById("loaderModal");
const closeLoader = document.getElementById("closeLoader");
const slotRows = document.getElementById("slotRows");
const autoFillByName = document.getElementById("autoFillByName");
const clearAllBtn = document.getElementById("clearAll");

const audioPlayer = document.getElementById("audioPlayer");


/* ============================================================
   Now Playing overlay text (drawn on top of the PNG "Now playing" window)
============================================================ */
function ensureNowPlayingEl(){
  const direct = document.getElementById("nowPlayingText");
  if (direct){
    // If the inline window exists, avoid drawing the overlay mask on top of it.
    document.getElementById("nowPlayingOverlayText")?.remove();
    return null;
  }

  let el = document.getElementById("nowPlayingOverlayText");
  if (el) return el;

  // Create and position within overlay
  const overlay = document.querySelector(".overlay");
  if (!overlay) return null;

  el = document.createElement("div");
  el.id = "nowPlayingOverlayText";
  el.className = "now-playing-overlay-text";
  el.setAttribute("aria-live", "polite");
  el.style.position = "absolute";
  // These numbers align with the PNG "Now playing" text area.
  // Tweak if you ever change the image.
  el.style.left = "var(--np-left, 22%)";
  el.style.top = "var(--np-top, 86.6%)";
  el.style.width = "var(--np-w, 56%)";
  el.style.height = "var(--np-h, 5.7%)";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.pointerEvents = "none";
  el.style.zIndex = "900";
  el.style.whiteSpace = "nowrap";
  el.style.overflow = "hidden";
  el.style.textOverflow = "ellipsis";
    el.innerHTML = `<div class="np-title"><span id="npTitleSpan">—</span></div>`;

  overlay.appendChild(el);
  return el;
}

function setNowPlayingText(text){
  // Prefer writing directly into the lower window element if it exists in the HTML
  const direct = document.getElementById("nowPlayingText");
  const value = (text && String(text).trim()) ? String(text) : "—";

  if (direct){
    direct.textContent = value;
    return;
  }

  // Fallback: injected overlay text (legacy)
  const el = ensureNowPlayingEl();
  if (!el) return;

  const span = el.querySelector("#npTitleSpan");
  if (!span) return;

  span.classList.remove("marquee");
  span.textContent = value;

  requestAnimationFrame(() => {
    const titleBox = el.querySelector(".np-title");
    if (!titleBox) return;
    const needs = span.scrollWidth > titleBox.clientWidth + 4;
    if (needs) span.classList.add("marquee");
  });
}

function isAudioPlaying(){
  return audioPlayer && !audioPlayer.paused && !audioPlayer.ended && audioPlayer.currentTime > 0;
}


/* ============================================================
   Click sound (low-latency, no external asset)
   Uses WebAudio oscillator; safe fallback if AudioContext blocked.
============================================================ */
let _audioCtx = null;
function playClickSound(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!_audioCtx) _audioCtx = new AC();
    if (_audioCtx.state === "suspended") _audioCtx.resume().catch(()=>{});

    const t0 = _audioCtx.currentTime;
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();

    // a short "button" click: high-ish pitch, fast decay
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t0);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);

    osc.connect(gain);
    gain.connect(_audioCtx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.07);
  }catch(_){
    _pendingNowPlayingTitle = null;
}
}

/* ============================================================
   Button dim flash (letters + numbers)
   - Adds a brief white "flash" overlay for 1 second when a key is pressed
============================================================ */
const DIM_FLASH_MS = 500;

function flashDim(btn){
  if (!btn) return;

  // restart timer on rapid presses
  if (btn._dimFlashT) clearTimeout(btn._dimFlashT);

  btn.classList.add("btn-dim-flash");

  btn._dimFlashT = setTimeout(() => {
    btn.classList.remove("btn-dim-flash");
    btn._dimFlashT = null;
  }, DIM_FLASH_MS);
}



let _pendingNowPlayingTitle = null;

// When audio actually starts, NOW PLAYING becomes authoritative
audioPlayer?.addEventListener("playing", () => {
  if (_pendingNowPlayingTitle != null){
    setNowPlayingConfirmed(_pendingNowPlayingTitle);
    _pendingNowPlayingTitle = null;
  }
});




const stack = document.getElementById("stack");
const front = document.getElementById("front");
const back  = document.getElementById("back");

const pageLeftHot  = document.getElementById("pageLeft");
const pageRightHot = document.getElementById("pageRight");
const dial = document.getElementById("dial");

const lettersWrap = document.getElementById("letters");
const numbersWrap = document.getElementById("numbers");

const prevQueue = document.getElementById("prevQueue");
const nextQueue = document.getElementById("nextQueue");
const playingNextText = document.getElementById("playingNextText");
const transportPrev = document.getElementById("transportPrev");
const transportPause = document.getElementById("transportPause");
const transportPlay = document.getElementById("transportPlay");
const transportStop = document.getElementById("transportStop");
const transportNext = document.getElementById("transportNext");

/* State */
const letters = ["A","B","C","D","E","F","G","H"];
let pageIndex = 0;
let isAnimating = false;

let selectedLetter = null;
let queue = [];
let queueCursor = -1;

let browseCursor = -1;         // cursor for previewing queue (prev/next)
let _nowPlayingTitle = "—";    // last confirmed playing title
let _previewTimer = null;

function setNowPlayingConfirmed(title){
  _nowPlayingTitle = title && String(title).trim() ? String(title) : "—";
  setNowPlayingText(_nowPlayingTitle);
  const el = document.getElementById("nowPlayingOverlayText");
  if (el) el.classList.remove("preview");
}

function setPlayingNextText(text){
  if (!playingNextText) return;
  const value = (text && String(text).trim()) ? String(text) : "—";
  playingNextText.textContent = value;
}

function updatePlayingNext(){
  if (queue.length === 0 || queueCursor < 0){
    browseCursor = -1;
    setPlayingNextText("—");
    return;
  }

  const nextIndex = queueCursor + 1;
  if (nextIndex >= queue.length){
    browseCursor = -1;
    setPlayingNextText("—");
    return;
  }

  if (browseCursor < nextIndex || browseCursor >= queue.length){
    browseCursor = nextIndex;
  }
  setPlayingNextText(queue[browseCursor]?.title || queue[browseCursor]?.code || "—");
}


let pages = []; // 8 pages x 8 songs

function makeEmptyPages(){
  return letters.map(L => Array.from({length:8}, (_,i)=>({
    code: `${L}${i+1}`,
    title: `Song ${L}${i+1}`,
    hasFile: false
  })));
}

async function refreshPagesFromDB(){
  const all = await dbGetAll();
  const map = new Map(all.map(r => [r.slot, r]));
  pages = makeEmptyPages();

  for (const page of pages){
    for (const song of page){
      const rec = map.get(song.code);
      if (rec){
        song.title = rec.title || titleFromFilename(rec.fileName || song.code);
        song.hasFile = true;
      }
    }
  }
}

/* Render */
function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function cardHTML(song){
  return `
    <div class="song-card" data-code="${song.code}" title="${escapeHTML(song.title)}">
      <span class="song-code">${song.code}</span>
      <span class="song-title">${escapeHTML(song.title)}</span>
    </div>
  `;
}
function renderPage(el, pageSongs){
  const left = pageSongs.slice(0,4);
  const right = pageSongs.slice(4,8);
  el.innerHTML = `
    <div class="cards-panel">
      <div class="cols">
        <div class="col">${left.map(cardHTML).join("")}</div>
        <div class="col">${right.map(cardHTML).join("")}</div>
      </div>
    </div>
  `;
}
function renderCurrent(){ renderPage(front, pages[pageIndex]); }

/* Flip */
function flipToPage(newIndex){
  if (isAnimating || !stack || !front || !back) return;
  isAnimating = true;

  const nextIndex = (newIndex + pages.length) % pages.length;

  // Dial spin sheen
  if (dial) {
    dial.classList.remove("dial-spin-left","dial-spin-right");
    const goingRight = (nextIndex > pageIndex) || (pageIndex === pages.length - 1 && nextIndex === 0);
    dial.classList.add(goingRight ? "dial-spin-right" : "dial-spin-left");
    window.setTimeout(() => dial.classList.remove("dial-spin-left","dial-spin-right"), 460);
  }

  renderPage(back, pages[nextIndex]);

  stack.classList.remove("flipping");
  void stack.offsetWidth;
  stack.classList.add("flipping");

  const onDone = () => {
    pageIndex = nextIndex;
    renderPage(front, pages[pageIndex]);
    stack.classList.remove("flipping");
    back.innerHTML = "";
    isAnimating = false;
  };

  let done = false;
  const finish = () => { if (!done) { done = true; onDone(); } };
  stack.addEventListener("transitionend", finish, { once: true });
  window.setTimeout(finish, 460);
}

/* Controls */
function bindPaging(){
  const firePrev = (e) => { e.preventDefault?.(); flipToPage(pageIndex - 1); };
  const fireNext = (e) => { e.preventDefault?.(); flipToPage(pageIndex + 1); };

  pageLeftHot?.addEventListener("click", firePrev);
  pageRightHot?.addEventListener("click", fireNext);
  pageLeftHot?.addEventListener("pointerdown", firePrev, { passive: false });
  pageRightHot?.addEventListener("pointerdown", fireNext, { passive: false });
  pageLeftHot?.addEventListener("touchstart", firePrev, { passive: false });
  pageRightHot?.addEventListener("touchstart", fireNext, { passive: false });

  dial?.addEventListener("click", (e) => {
    const rect = dial.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const goRight = x >= rect.width / 2;
    flipToPage(pageIndex + (goRight ? 1 : -1));
  });

  let dragStartX = null;
  dial?.addEventListener("pointerdown", (e) => {
    dial.setPointerCapture?.(e.pointerId);
    dragStartX = e.clientX;
  });
  dial?.addEventListener("pointermove", (e) => {
    if (dragStartX == null) return;
    const dx = e.clientX - dragStartX;
    const threshold = 30;
    if (dx > threshold){ dragStartX = e.clientX; flipToPage(pageIndex + 1); }
    else if (dx < -threshold){ dragStartX = e.clientX; flipToPage(pageIndex - 1); }
  });
  const clearDrag = () => { dragStartX = null; };
  dial?.addEventListener("pointerup", clearDrag);
  dial?.addEventListener("pointercancel", clearDrag);
}

function buildKeys(){
  lettersWrap.innerHTML = letters.map(l => `<button class="key" data-letter="${l}">${l}</button>`).join("");
  numbersWrap.innerHTML = ["1","2","3","4","5","6","7","8"].map(n => `<button class="key" data-number="${n}">${n}</button>`).join("");
}
/* ============================================================
   Input helpers (avoid double-firing on touch devices)
   Many mobile browsers will fire: pointerdown/touchstart AND a synthetic click.
   This helper runs your handler once per user press.
============================================================ */
function addPressListener(el, handler, opts = {}) {
  if (!el) return;
  const IGNORE_CLICK_MS = opts.ignoreClickMs ?? 700;
  let lastNonClickAt = 0;

  const run = (e) => {
    // Ignore the synthetic click that follows a touch/pointer press
    if (e.type === "click" && (Date.now() - lastNonClickAt) < IGNORE_CLICK_MS) return;
    if (e.type !== "click") lastNonClickAt = Date.now();

    // Allow preventDefault in handlers for pointer/touch
    try { e.preventDefault?.(); } catch(_) {}

    const out = handler(e);
    // swallow async rejections (we already log issues elsewhere)
    if (out && typeof out.catch === "function") out.catch(()=>{});
  };

  if (window.PointerEvent) {
    el.addEventListener("pointerdown", run, { passive: false });
    el.addEventListener("click", run);
  } else {
    el.addEventListener("touchstart", run, { passive: false });
    el.addEventListener("click", run);
  }
}

const onLetterPress = (e) => {
  const btn = e.target.closest("button[data-letter]");
  if (!btn) return;

  playClickSound();
  flashDim(btn);
  selectedLetter = btn.dataset.letter;
};

const onNumberPress = async (e) => {
  const btn = e.target.closest("button[data-number]");
  if (!btn || !selectedLetter) return;

  playClickSound();
  flashDim(btn);
  const code = `${selectedLetter}${btn.dataset.number}`;
  await queueSong(code);
};

const onCardPress = async (e) => {
  const card = e.target.closest(".song-card[data-code]");
  if (!card) return;

  playClickSound();
  await queueSong(card.dataset.code);
};

// Bind once-per-press (prevents double beep + keeps dim working)
addPressListener(lettersWrap, onLetterPress);
addPressListener(numbersWrap, onNumberPress);
addPressListener(front, onCardPress);
addPressListener(transportPrev, async () => {
  playClickSound();
  if (queue.length === 0) return;
  if (queueCursor > 0){
    queueCursor -= 1;
    browseCursor = queueCursor;
    await playSlot(queue[queueCursor].code, true);
  } else if (audioPlayer) {
    audioPlayer.pause();
    try { audioPlayer.currentTime = 0; } catch(_) {}
  }
});
addPressListener(transportPause, () => {
  playClickSound();
  audioPlayer?.pause();
});
addPressListener(transportPlay, async () => {
  playClickSound();
  if (queue.length === 0) return;
  if (queueCursor < 0) queueCursor = 0;
  browseCursor = queueCursor;
  if (audioPlayer?.paused && audioPlayer.src){
    await audioPlayer.play().catch(()=>{});
    return;
  }
  await playSlot(queue[queueCursor].code, true);
});
addPressListener(transportStop, () => {
  playClickSound();
  if (!audioPlayer) return;
  audioPlayer.pause();
  try { audioPlayer.currentTime = 0; } catch(_) {}
});
addPressListener(transportNext, async () => {
  playClickSound();
  if (queue.length === 0) return;
  if (queueCursor < queue.length - 1){
    queueCursor += 1;
    browseCursor = queueCursor;
    await playSlot(queue[queueCursor].code, true);
  } else if (audioPlayer) {
    audioPlayer.pause();
    try { audioPlayer.currentTime = 0; } catch(_) {}
  }
});


async function queueSong(code){
  const rec = await dbGet(code);
  if (!rec || !rec.blob){
    console.warn("No file assigned for", code);
    return;
  }

  const title = rec.title || titleFromFilename(rec.fileName || code);

  // Add to queue
  queue.push({ code, title });

  // Start immediately on the first selection
  if (!isAudioPlaying() && queueCursor < 0){
    queueCursor = 0;
    browseCursor = queueCursor;
    setNowPlayingText(title);
    await playSlot(queue[queueCursor].code, /*userInitiated*/ true);
    updatePlayingNext();
    return;
  }

  // If something is already playing, just queue it up.
  if (queueCursor < 0) queueCursor = 0;
  browseCursor = queueCursor;
    browseCursor = queueCursor;

  // Keep "Now playing" showing the current track
  const current = queue[queueCursor];
  if (current) setNowPlayingText(current.title);
  updatePlayingNext();
}




prevQueue?.addEventListener("click", () => {
  if (queue.length === 0 || queueCursor < 0) return;
  const minIndex = queueCursor + 1;
  if (minIndex >= queue.length){
    setPlayingNextText("—");
    browseCursor = -1;
    return;
  }
  if (browseCursor < minIndex) browseCursor = minIndex;
  browseCursor = Math.max(minIndex, browseCursor - 1);
  setPlayingNextText(queue[browseCursor]?.title || queue[browseCursor]?.code || "—");
});
nextQueue?.addEventListener("click", () => {
  if (queue.length === 0 || queueCursor < 0) return;
  const minIndex = queueCursor + 1;
  if (minIndex >= queue.length){
    setPlayingNextText("—");
    browseCursor = -1;
    return;
  }
  if (browseCursor < minIndex) browseCursor = minIndex;
  browseCursor = Math.min(queue.length - 1, browseCursor + 1);
  setPlayingNextText(queue[browseCursor]?.title || queue[browseCursor]?.code || "—");
});


async function playSlot(code, userInitiated = false){
  const rec = await dbGet(code);
  if (!rec || !rec.blob) return;

  const title = rec.title || titleFromFilename(rec.fileName || code);
  _pendingNowPlayingTitle = title;
  setNowPlayingText(title);

  const url = URL.createObjectURL(rec.blob);
  audioPlayer.src = url;

  try{
    if (userInitiated) await audioPlayer.play();
    else audioPlayer.play().catch(()=>{});
  }catch(_){
    _pendingNowPlayingTitle = null;
}

  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  updatePlayingNext();
}


/* Loader modal */
function openLoader(){ loaderModal.classList.remove("hidden"); }
function closeLoaderUI(){ loaderModal.classList.add("hidden"); }

hamburger?.addEventListener("click", openLoader);
closeLoader?.addEventListener("click", closeLoaderUI);
loaderModal?.addEventListener("click", (e) => { if (e.target === loaderModal) closeLoaderUI(); });

function makeSlotRow(slot){
  const tr = document.createElement("tr");
  tr.className = "slot-row";
  tr.dataset.slot = slot;

  const tdSlot = document.createElement("td");
  tdSlot.className = "cell-slot";
  tdSlot.textContent = slot;

  const tdTitle = document.createElement("td");
  const input = document.createElement("input");
  input.className = "title-input";
  input.type = "text";
  input.placeholder = "Title (auto from filename)";
  tdTitle.appendChild(input);

  const tdFile = document.createElement("td");
  tdFile.className = "cell-file";
  tdFile.textContent = "—";

  const tdActions = document.createElement("td");
  tdActions.className = "row-actions";

  const pickBtn = document.createElement("button");
  pickBtn.className = "btn small";
  pickBtn.type = "button";
  pickBtn.textContent = "Choose MP3";

  const clearBtn = document.createElement("button");
  clearBtn.className = "btn small btn-danger";
  clearBtn.type = "button";
  clearBtn.textContent = "Clear";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/mpeg,audio/mp3";
  fileInput.className = "hidden";

  pickBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const title = input.value?.trim() || titleFromFilename(file.name);

    await dbPut({ slot, fileName: file.name, title, mime: file.type || "audio/mpeg", blob: file });

    input.value = title;
    tdFile.textContent = file.name;

    await refreshPagesFromDB();
    renderCurrent();
  });

  input.addEventListener("change", async () => {
    const rec = await dbGet(slot);
    if (!rec) return;
    rec.title = input.value.trim() || rec.title;
    await dbPut(rec);
    await refreshPagesFromDB();
    renderCurrent();
  });

  clearBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await dbDelete(slot);
    input.value = "";
    tdFile.textContent = "—";
    await refreshPagesFromDB();
    renderCurrent();
  });

  tdActions.appendChild(pickBtn);
  tdActions.appendChild(clearBtn);
  tdActions.appendChild(fileInput);

  tr.appendChild(tdSlot);
  tr.appendChild(tdTitle);
  tr.appendChild(tdFile);
  tr.appendChild(tdActions);

  tr.addEventListener("click", () => pickBtn.click());

  // allow row-level file selection
  return { tr, input, tdFile, fileInput };
}

async function populateLoader(){
  slotRows.innerHTML = "";
  const records = await dbGetAll();
  const map = new Map(records.map(r => [r.slot, r]));

  for (const L of letters){
    for (let i=1;i<=8;i++){
      const slot = `${L}${i}`;
      const { tr, input, tdFile } = makeSlotRow(slot);
      const rec = map.get(slot);
      if (rec){
        input.value = rec.title || titleFromFilename(rec.fileName || slot);
        tdFile.textContent = rec.fileName || "—";
      }
      slotRows.appendChild(tr);
    }
  }
}

autoFillByName?.addEventListener("click", async () => {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "audio/mpeg,audio/mp3";
  picker.multiple = true;

  picker.addEventListener("change", async () => {
    const files = Array.from(picker.files || []);
    if (files.length === 0) return;

    let idx = 0;
    for (const L of letters){
      for (let i=1;i<=8;i++){
        if (idx >= files.length) break;
        const slot = `${L}${i}`;
        const f = files[idx++];
        await dbPut({ slot, fileName: f.name, title: titleFromFilename(f.name), mime: f.type || "audio/mpeg", blob: f });
      }
    }

    await refreshPagesFromDB();
    renderCurrent();
    await populateLoader();
  });

  picker.click();
});

clearAllBtn?.addEventListener("click", async () => {
  if (!confirm("Clear all assigned songs?")) return;
  await dbClearAll();
  await refreshPagesFromDB();
  renderCurrent();
  await populateLoader();
});

/* Init */
(async function init(){
  buildKeys();
  bindPaging();

  // Toggle hotspot outlines for alignment: press "d"
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "d") document.body.classList.toggle("debug-hotspots");
  });


  ensureNowPlayingEl();

// Auto-advance when a track finishes
audioPlayer?.addEventListener("ended", async () => {
  if (queue.length === 0) return;

  if (queueCursor < queue.length - 1){
    queueCursor += 1;
    await playSlot(queue[queueCursor].code, false);
  } else {
    setNowPlayingConfirmed("—");
    browseCursor = -1;
    setPlayingNextText("—");
  }
});


  pages = makeEmptyPages();
  await refreshPagesFromDB();
  renderCurrent();
  ensureNowPlayingEl();
  setNowPlayingConfirmed("—");
    browseCursor = -1;
  setPlayingNextText("—");
  await populateLoader();
})();
