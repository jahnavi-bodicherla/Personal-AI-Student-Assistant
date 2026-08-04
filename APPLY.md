# Handwritten notes + thinking indicator

Two changes to your existing project. Copy these files over the matching paths
in `study-assistant/` — the folder structure here mirrors yours exactly.

Nothing else was touched: auth, chat, quiz, progress, and the summarizer are
all unchanged.

---

## Files

**New (2)**

| File | Purpose |
|---|---|
| `backend/app/services/handwriting.py` | Reads handwriting from a photo via a vision model |
| `frontend/src/components/AssistantMark.jsx` | The logo mark, with a thinking animation |

**Modified (6)**

| File | Change |
|---|---|
| `backend/app/config.py` | Added `OPENAI_VISION_MODEL` |
| `backend/app/schemas/notes.py` | Added `isHandwritten` (defaults to `False`) |
| `backend/app/routers/notes.py` | Image uploads route to transcription |
| `frontend/src/components/chat/TypingIndicator.jsx` | Now shows logo + "Thinking" |
| `frontend/src/pages/Notes.jsx` | Accepts images, shows handwritten badge |
| `frontend/src/pages/NoteDetail.jsx` | Shows a "transcribed" badge |
| `frontend/src/index.css` | Added the `shimmer` keyframe |

No new packages. `openai`, `pypdf` and `python-docx` already cover it, so
`requirements.txt` and `package.json` are untouched.

---

## 1. Point the vision model at something that can see

Your `.env` sets `OPENAI_MODEL=mistral:latest`, which is text-only — it cannot
accept an image at all. Handwriting therefore needs its own model setting.

Add one line to `backend/.env`:

```bash
# Hosted OpenAI
OPENAI_VISION_MODEL=gpt-4o-mini
```

```bash
# Or, if you're running Ollama locally
OPENAI_VISION_MODEL=llama3.2-vision
```

For Ollama, pull it first: `ollama pull llama3.2-vision`

If you skip this, document uploads keep working exactly as before and only
image uploads fail — with a message naming the setting.

## 2. Restart

```bash
cd backend  && hypercorn app.main:app --reload --bind 127.0.0.1:8000
cd frontend && npm run dev
```

No database migration. `isHandwritten` defaults to `False`, so notes you
uploaded before this change still load.

---

## Trying it

**Handwriting** — go to Notes, choose a photo of a handwritten page (PNG, JPG
or WEBP). The button reads "Reading handwriting…" while the model works.
Once done the note appears with an ✍️ badge, and from there it behaves like any
other note: ask questions, generate a summary, build a quiz.

**Thinking indicator** — send a message in Chat, or ask a question on a note.
The old three grey dots are replaced by the logo mark with an orbiting ring and
a shimmering "Thinking" label.

---

## How each piece works

**Transcription, not interpretation.** The prompt tells the model to transcribe
only what is written — never to complete, correct, or fill in gaps. Illegible
words come back as `[?]` rather than a plausible guess, because a wrong word
silently entering your notes is worse than a visible gap. Temperature is 0.1
for the same reason.

**Structure is preserved.** Headings stay headings, lists stay lists, formulas
come back as LaTeX, and diagrams are described in italics rather than mangled
into ASCII art. That means the summarizer and quiz generator receive the same
shape of Markdown they already handle for PDFs.

**A separate size limit.** Photos are bigger than documents, so images get
12 MB while documents keep the existing 15 MB.

**The label advances.** "Thinking" becomes "Working through it" at 4 seconds and
"Putting it together" at 9. A caption frozen for fifteen seconds reads as a
hang; one that changes reads as progress. The dots bounce independently of the
label, so motion never stops even at the moment the text swaps.

**Motion can be turned off.** `index.css` now honours
`prefers-reduced-motion`, so the spin, ping and shimmer collapse for anyone
whose OS asks for reduced motion.

---

## If something goes wrong

**"Handwriting recognition failed… check that OPENAI_VISION_MODEL is a
vision-capable model."** Step 1 wasn't done, or the model name isn't available
at your `OPENAI_BASE_URL`. Ollama users: confirm with `ollama list`.

**"No handwriting could be read from this image."** Usually a blurry, angled,
or dim photo. Shoot straight down on the page in good light.

**Badge doesn't appear on an older note.** Expected — notes uploaded before
this change have no `isHandwritten` field and default to `False`. Re-upload if
you want the badge.

**Transcription has mistakes.** It will sometimes, on messy handwriting. That's
why the note header carries a "Transcribed from handwriting" badge: treat the
text as a draft and check anything surprising against the original page.
