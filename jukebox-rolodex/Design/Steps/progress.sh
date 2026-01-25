#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILE="$DIR/progress.json"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required"
  exit 1
fi

cmd="${1:-status}"

python3 - "$cmd" "$FILE" "${2:-}" <<'PY'
import json, sys, pathlib

cmd = sys.argv[1]
path = pathlib.Path(sys.argv[2])
arg = sys.argv[3] if len(sys.argv) > 3 else ""

steps = [
  "Step 01 — Architecture Overview",
  "Step 02 — Prepare Project Structure",
  "Step 03 — Clerk Authentication Setup",
  "Step 04 — Supabase Database Setup",
  "Step 05 — Cloudflare R2 Storage Setup",
  "Step 06 — Vercel Serverless Functions",
  "Step 07 — Client Upload Flow",
  "Step 08 — Client Playback Flow",
  "Step 09 — Local + Production Testing",
  "Step 10 — Future Improvements",
]

if not path.exists():
  data = {"currentStep": 1, "done": [], "notes": ""}
  path.write_text(json.dumps(data, indent=2))
else:
  data = json.loads(path.read_text())

def status():
  cur = int(data.get("currentStep", 1))
  done = set(map(int, data.get("done", [])))
  print("JUKEBOX progress:\n")
  for i, name in enumerate(steps, start=1):
    mark = "✅" if i in done else ("➡️ " if i == cur else "⬜")
    print(f"{mark} {name}")
  notes = data.get("notes", "").strip()
  if notes:
    print("\nNotes:")
    print(notes)

def set_step(n):
  n = int(n)
  if n < 1 or n > len(steps):
    raise SystemExit(f"Step must be 1..{len(steps)}")
  data["currentStep"] = n
  path.write_text(json.dumps(data, indent=2))
  print(f"Current step set to {n}: {steps[n-1]}")

def done_step(n):
  n = int(n)
  done = set(map(int, data.get("done", [])))
  done.add(n)
  data["done"] = sorted(done)
  if int(data.get("currentStep", 1)) == n and n < len(steps):
    data["currentStep"] = n + 1
  path.write_text(json.dumps(data, indent=2))
  print(f"Marked done: {n}: {steps[n-1]}")

def note(txt):
  data["notes"] = txt
  path.write_text(json.dumps(data, indent=2))
  print("Saved note.")

if cmd == "status":
  status()
elif cmd == "set":
  if not arg: raise SystemExit("Usage: progress.sh set <stepNumber>")
  set_step(arg)
elif cmd == "done":
  if not arg: raise SystemExit("Usage: progress.sh done <stepNumber>")
  done_step(arg)
elif cmd == "note":
  if not arg: raise SystemExit('Usage: progress.sh note "your note here"')
  note(arg)
else:
  raise SystemExit("Commands: status | set <n> | done <n> | note "text"")
PY
