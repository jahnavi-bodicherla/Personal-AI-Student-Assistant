import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchNotes } from "../services/notesService";
import { generateQuiz } from "../services/quizService";
import { getErrorMessage } from "../utils/errorMessage";

const QUESTION_TYPES = [
  { key: "mcq", label: "Multiple Choice" },
  { key: "true_false", label: "True / False" },
  { key: "fill_blank", label: "Fill in the Blank" },
  { key: "coding", label: "Coding" },
];

export default function QuizGenerate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [sourceType, setSourceType] = useState(searchParams.get("noteId") ? "note" : "topic");
  const [noteId, setNoteId] = useState(searchParams.get("noteId") || "");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [counts, setCounts] = useState({ mcq: 3, true_false: 2, fill_blank: 2, coding: 0 });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

  const totalQuestions = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);

  const handleCountChange = (key, value) => {
    const num = Math.max(0, Math.min(10, Number(value) || 0));
    setCounts((prev) => ({ ...prev, [key]: num }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (totalQuestions < 1) {
      toast.error("Add at least one question.");
      return;
    }
    if (sourceType === "note" && !noteId) {
      toast.error("Select a note to generate the quiz from.");
      return;
    }
    if (sourceType === "topic" && !topic.trim()) {
      toast.error("Enter a topic to generate the quiz from.");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        difficulty,
        subject: subject || undefined,
        questionSpec: counts,
        ...(sourceType === "note" ? { noteId } : { topic: topic.trim() }),
      };
      const quiz = await generateQuiz(payload);
      toast.success("Quiz generated!");
      navigate(`/quiz/${quiz.id}/take`, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't generate the quiz."));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-10 md:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Generate a Quiz</h1>
        <p className="mt-1 text-slate-500">Choose a source and question mix.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Source</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSourceType("topic")}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  sourceType === "topic"
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Topic
              </button>
              <button
                type="button"
                onClick={() => setSourceType("note")}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  sourceType === "note"
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Uploaded Note
              </button>
            </div>
          </div>

          {sourceType === "topic" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Binary search trees"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/60"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Note</label>
              <select
                value={noteId}
                onChange={(e) => setNoteId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/60"
              >
                <option value="">Select a note...</option>
                {notes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.fileName}
                  </option>
                ))}
              </select>
              {notes.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  No notes uploaded yet — upload one first, or generate from a topic instead.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject (optional)</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. DBMS"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/60"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Question mix</label>
            <div className="grid grid-cols-2 gap-3">
              {QUESTION_TYPES.map((type) => (
                <div key={type.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5">
                  <span className="text-sm text-slate-600">{type.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={counts[type.key]}
                    onChange={(e) => handleCountChange(type.key, e.target.value)}
                    className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none focus:border-brand-400"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Total: {totalQuestions} question(s) · max 25</p>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "Generating quiz..." : "Generate Quiz"}
          </button>
        </form>
      </div>
    </div>
  );
}
