# START HERE — Windows Setup (5 minutes)

This is the **only file you need to follow** to get both servers running.
Do every step in order. Don't skip the "verify" steps — they catch problems
before they turn into confusing errors later.

⚠️ **Never edit `backend\app\config.py` by hand.** All settings you need to
change live in `backend\.env` instead. This avoids the syntax/indentation
errors that come from editing Python files in Notepad.

---

## 0. One-time requirements

- Python 3.11+ installed and on PATH (`python --version` should work)
- Node.js 18+ installed (`node --version` should work)
- MongoDB running locally, OR a free MongoDB Atlas connection string
  - Easiest option if you don't want to install MongoDB: create a free
    cluster at https://www.mongodb.com/cloud/atlas/register and copy its
    connection string (looks like `mongodb+srv://user:pass@cluster.../`)
- An OpenAI API key from https://platform.openai.com/api-keys

---

## 1. Backend setup

Open **Command Prompt** (not PowerShell — simpler for this), and run these
one at a time:

```bat
cd study-assistant\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Wait for `pip install` to finish with no red errors before continuing.

### Create your `.env` file

```bat
copy .env.example .env
notepad .env
```

In the Notepad window that opens, you'll see lines like:

```
MONGO_URI=mongodb://localhost:27017
JWT_SECRET_KEY=replace_this_with_a_long_random_string
OPENAI_API_KEY=your_openai_api_key_here
```

Edit **only the values after the `=`** — do not touch anything in
`config.py`. Set:

- `MONGO_URI` — leave as-is if MongoDB is running locally, or paste your
  Atlas connection string
- `JWT_SECRET_KEY` — replace with any random string (mash your keyboard)
- `OPENAI_API_KEY` — paste your real key here, e.g. `OPENAI_API_KEY=sk-proj-...`

Save the file (Ctrl+S) and close Notepad.

### Verify it's correct before running

```bat
findstr "OPENAI_API_KEY" .env
```

This should print your key starting with `sk-`. If it's still
`your_openai_api_key_here`, the save didn't take — open `.env` again and fix it.

### Start the backend

```bat
hypercorn app.main:app --reload --bind 0.0.0.0:8000
```

You should see it print something like `Running on http://0.0.0.0:8000`.
**Leave this window open.** If it errors instead, copy the FULL error text —
don't just say "same error" — the exact text is what tells us what's wrong.

### Verify the backend is really working

Open a browser to: **http://localhost:8000/api/health**

(Not `0.0.0.0` — that's not a real address, use `localhost`.)

You should see: `{"status":"ok","app":"AI Personal Study Assistant"}`

If you see that, the backend is 100% working. Don't touch it again.

---

## 2. Frontend setup

Open a **second, separate** Command Prompt window (leave the backend one
running):

```bat
cd study-assistant\frontend
npm install
npm run dev
```

You should see something like:

```
  VITE v5.4.x  ready in ... ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser (not `0.0.0.0`, not `8000`).

---

## 3. Using it

1. Register a new account on the signup page
2. You'll land on the Dashboard
3. Go to **AI Chat** and ask something — this is the first request that
   actually calls OpenAI, so it's the real test that your API key works

If chat gives a clean error message (not "Network Error") mentioning the AI
service, double check the `OPENAI_API_KEY` value in `.env` and restart the
backend (Ctrl+C in that window, then re-run the `hypercorn` command).

---

## If something still fails

Copy-paste (as **text**, not a screenshot) into the chat:

1. The full output from the `hypercorn` window
2. The full output from the `npm run dev` window
3. What `http://localhost:8000/api/health` shows in your browser

That's enough for a precise fix — screenshots of the frontend alone don't
show what the servers are actually doing.

---

## Security note

If you ever paste your real API key into a chat, terminal share, or
screenshot by accident, treat it as compromised: revoke it immediately at
https://platform.openai.com/api-keys and generate a new one. Keys belong in
`.env` only, which is already excluded from version control by `.gitignore`.
