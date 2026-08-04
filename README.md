# AI Personal Study Assistant

Milestones delivered so far:

1. **Full auth flow** — register → login → protected routes → token refresh → logout
2. **AI Chat module** — Markdown chat with syntax highlighting, conversation history, regenerate
3. **Upload Notes + AI Summarizer** — PDF/DOCX/TXT upload, note-scoped Q&A, structured summaries
4. **AI Quiz Generator** — MCQ/True-False/Fill-blank/Coding questions, auto-grading, score history
5. **Learning Analytics** — streaks, weekly/monthly charts, per-subject performance

Everything below has been verified to actually run: the backend was smoke-tested
end-to-end (with the LLM calls mocked, since no live API key exists in this
sandbox) against an in-memory Mongo, covering every endpoint; the frontend
production build compiles cleanly with zero errors.

---

## Stack notes

- **ASGI server: Hypercorn, not Uvicorn** (per project requirement). FastAPI is
  server-agnostic, so this is a drop-in swap.
- **LLM provider: OpenAI**, used consistently across chat, note Q&A,
  summarization, quiz generation, and coding-question grading — one provider,
  one `app/services/llm.py` module, so swapping providers later only touches
  that file.
- **Password hashing:** raw `bcrypt` (not `passlib`) — newer bcrypt releases
  broke passlib's version detection, so hashing/verification is done directly.
- **JWT:** access + refresh token pair. Refresh tokens rotate on use (the old
  one is revoked) and logout revokes the current access token, both via a
  `revoked_tokens` collection keyed by each token's `jti`.

---

## Backend setup

```bash
cd backend
python3 -m venv venv
. venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env         # then edit JWT_SECRET_KEY, MONGO_URI, OPENAI_API_KEY, etc.

# Make sure MongoDB is running locally, or point MONGO_URI at Atlas / a remote instance.

hypercorn app.main:app --reload --bind 0.0.0.0:8000
```

API docs (Swagger UI) will be at `http://localhost:8000/docs`.

### Auth endpoints

| Method | Path                | Auth required | Description                          |
|--------|---------------------|----------------|---------------------------------------|
| POST   | `/api/auth/register`| No             | Create account, returns user + tokens |
| POST   | `/api/auth/login`   | No             | Returns user + tokens                 |
| POST   | `/api/auth/refresh` | No (refresh token in body) | Rotates and returns a new token pair |
| POST   | `/api/auth/logout`  | Yes (Bearer)   | Revokes the current access token      |
| GET    | `/api/auth/me`      | Yes (Bearer)   | Returns the current user's profile    |
| GET    | `/api/profile`      | Yes (Bearer)   | Same as `/me`                         |
| PUT    | `/api/profile`      | Yes (Bearer)   | Partially update profile fields       |

### Chat endpoints

| Method | Path                                  | Description                              |
|--------|----------------------------------------|-------------------------------------------|
| POST   | `/api/chat`                            | Send a message; omit `conversationId` to start a new chat |
| GET    | `/api/chat/history`                    | List conversation summaries               |
| GET    | `/api/chat/{conversation_id}`          | Full conversation with all messages       |
| DELETE | `/api/chat/{conversation_id}`          | Delete a conversation                     |
| POST   | `/api/chat/{conversation_id}/regenerate` | Regenerate the last AI response         |

### Notes endpoints

| Method | Path                             | Description                                  |
|--------|-----------------------------------|-----------------------------------------------|
| POST   | `/api/notes/upload`               | Upload PDF/DOCX/TXT (multipart form: `file`, optional `subject`) |
| GET    | `/api/notes`                      | List uploaded notes                           |
| GET    | `/api/notes/{note_id}`            | Get extracted text + metadata                 |
| DELETE | `/api/notes/{note_id}`            | Delete a note (and its summary)               |
| POST   | `/api/notes/{note_id}/ask`        | Ask a question, answered only from that note's content |
| POST   | `/api/notes/{note_id}/summary`    | Generate (or regenerate) the structured summary |
| GET    | `/api/notes/{note_id}/summary`    | Fetch the saved summary                       |

The summary includes: short summary, detailed summary, exam revision notes,
key points, important definitions, a formula sheet (if applicable), and a
text-based mind map — all generated in a single JSON-mode LLM call and
persisted in the `note_summaries` collection.

### Quiz endpoints

| Method | Path                          | Description                                   |
|--------|--------------------------------|------------------------------------------------|
| POST   | `/api/quiz/generate`           | Generate a quiz from a note or a free-text topic |
| GET    | `/api/quiz/history`            | List past quizzes with scores                  |
| GET    | `/api/quiz/{quiz_id}`          | Get quiz questions (answer key hidden until submitted) |
| POST   | `/api/quiz/{quiz_id}/submit`   | Submit answers; grades and stores the attempt   |
| GET    | `/api/quiz/{quiz_id}/result`   | Fetch a completed quiz's graded results         |
| DELETE | `/api/quiz/{quiz_id}`          | Delete a quiz and its attempt history           |

Question types: MCQ, True/False, Fill-in-the-blank, Coding. Objective types
are graded by exact (normalized) string match; coding answers are graded by
the LLM against a reference solution, batched into a single call per
submission.

### Progress / analytics endpoint

| Method | Path            | Description                                                |
|--------|------------------|--------------------------------------------------------------|
| GET    | `/api/progress`  | Overview stats, 7-day and 30-day activity series, subject breakdown |

Every chat message, note question, and quiz submission logs into a per-day
`activity_log` collection (via `app/services/activity_tracker.py`), which
powers the streak calculation and the weekly/monthly charts.

---

## Frontend setup

```bash
cd frontend
npm install

# Optional: create a .env with VITE_API_URL if the backend isn't on localhost:8000
# VITE_API_URL=http://localhost:8000

npm run dev
```

Visit `http://localhost:5173`. You'll land on `/login` (or `/register`);
successful auth redirects to the protected `/dashboard`.

### Pages

- **Dashboard** — welcome message, live stats from `/api/progress`, quick links
- **Chat** — Markdown rendering, syntax-highlighted code blocks with copy
  button, conversation history sidebar, regenerate response, typing indicator
- **Notes** — upload PDF/DOCX/TXT, per-note "Ask Questions" and "Summary" tabs
  (short/detailed summary, exam revision notes, key points, definitions,
  formula sheet, mind map)
- **Quiz** — generate from a note or topic with a configurable question mix,
  take the quiz (per-type input UI), graded results with a correct/incorrect
  chart and per-question breakdown, quiz history
- **Progress** — overview stat cards, weekly bar chart, monthly line chart,
  per-subject performance chart (all via Recharts)

All of the above sit behind a shared, responsive `Sidebar` + `AppLayout`
(collapses to a drawer on mobile), built on top of the same `AuthContext` and
`ProtectedRoute` from the auth milestone — nothing there was modified.

---

## Verified behavior (smoke-tested)

**Auth:** register/duplicate-email/login/wrong-password/`/me`/profile
update/refresh rotation/reused-refresh rejection/logout revocation.

**Chat:** new conversation creation, continuation, history listing, full
detail retrieval, regenerate (replaces rather than appends), cross-user
isolation (404), deletion.

**Notes:** real PDF text extraction (via a generated test PDF), real DOCX
extraction (including paragraphs), TXT extraction, unsupported file type
rejection (415), note-scoped Q&A, summary generation/fetch.

**Quiz:** generation with a mixed question spec, answer key hidden from the
client pre-submission, grading (objective exact-match + mocked coding grading),
correct percentage calculation, re-submission rejection (400), history listing,
result retrieval.

**Progress:** overview aggregation (questions/hours/streak/avg score/notes
count), 7-day and 30-day activity series with correct zero-filling for
inactive days, subject breakdown aggregation.

---

## Next milestones (not yet built)

- Flashcard generator
- Chat/notes export as PDF
- Voice input / text-to-speech
- Admin dashboard

