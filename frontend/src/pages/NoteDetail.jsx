import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  askNote,
  fetchNote,
  fetchNoteSummary,
  generateNoteSummary,
} from "../services/notesService";
import { getErrorMessage } from "../utils/errorMessage";
import ChatInput from "../components/chat/ChatInput";
import TypingIndicator from "../components/chat/TypingIndicator";
import MarkdownContent from "../components/MarkdownContent";

const TABS = [
  { id: "ask", label: "Ask Questions" },
  { id: "summary", label: "Summary" },
];

export default function NoteDetail() {
  const { noteId } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [isLoadingNote, setIsLoadingNote] = useState(true);
  const [activeTab, setActiveTab] = useState("ask");

  const [qaPairs, setQaPairs] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  const [summary, setSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    fetchNote(noteId)
      .then(setNote)
      .catch((err) => {
        toast.error(getErrorMessage(err, "Couldn't load this note."));
        navigate("/notes", { replace: true });
      })
      .finally(() => setIsLoadingNote(false));
  }, [noteId, navigate]);

  const loadSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const data = await fetchNoteSummary(noteId);
      setSummary(data);
    } catch {
      setSummary(null); // 404 = no summary yet, which is fine
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === "summary" && summary === null) {
      loadSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleAsk = async (question) => {
    setQaPairs((prev) => [...prev, { question, answer: null }]);
    setIsAsking(true);
    try {
      const result = await askNote(noteId, question);
      setQaPairs((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { question, answer: result.answer };
        return copy;
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't get an answer for that question."));
      setQaPairs((prev) => prev.slice(0, -1));
    } finally {
      setIsAsking(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const data = await generateNoteSummary(noteId);
      setSummary(data);
      toast.success("Summary generated!");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't generate a summary."));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (isLoadingNote) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link to="/notes" className="text-xs text-slate-400 hover:text-brand-600">
              ← Back to notes
            </Link>
            <h1 className="mt-1 truncate text-lg font-semibold text-slate-900">{note?.fileName}</h1>
            <p className="flex items-center gap-2 text-sm text-slate-500">
              {note?.subject || "General"}
              {note?.isHandwritten && (
                <span
                  className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                  /* OCR on handwriting is good but not perfect, so say so
                     rather than letting a misread word pass as the source. */
                  title="Transcribed from a photo — check anything that looks off against the original page."
                >
                  ✍️ Transcribed from handwriting
                </span>
              )}
            </p>
          </div>
          <Link
            to={`/quiz/new?noteId=${noteId}`}
            className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Generate Quiz
          </Link>
        </div>

        <div className="mt-4 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "ask" ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            {qaPairs.length === 0 ? (
              <div className="mx-auto max-w-xl pt-10 text-center text-slate-400">
                Ask a question and the AI will answer using only this note's content.
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {qaPairs.map((pair, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl bg-brand-600 px-4 py-3 text-sm text-white shadow-sm">
                        {pair.question}
                      </div>
                    </div>
                    {pair.answer ? (
                      <div className="flex justify-start">
                        <div className="max-w-[75%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                          <MarkdownContent content={pair.answer} />
                        </div>
                      </div>
                    ) : (
                      <TypingIndicator />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 md:px-8">
            <div className="mx-auto max-w-3xl">
              <ChatInput onSend={handleAsk} disabled={isAsking} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl">
            {isLoadingSummary ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : !summary ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-slate-500">No summary yet for this note.</p>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {isGeneratingSummary ? "Generating..." : "Generate Summary"}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                  >
                    {isGeneratingSummary ? "Regenerating..." : "↻ Regenerate"}
                  </button>
                </div>

                <SummarySection title="Short Summary">
                  <p className="text-sm text-slate-700">{summary.shortSummary}</p>
                </SummarySection>

                <SummarySection title="Detailed Summary">
                  <MarkdownContent content={summary.detailedSummary} />
                </SummarySection>

                <SummarySection title="Exam Revision Notes">
                  <MarkdownContent content={summary.examRevisionNotes} />
                </SummarySection>

                <SummarySection title="Key Points">
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {summary.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </SummarySection>

                <SummarySection title="Important Definitions">
                  <dl className="space-y-2">
                    {summary.definitions.map((d, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-sm font-semibold text-slate-800">{d.term}</dt>
                        <dd className="text-sm text-slate-600">{d.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </SummarySection>

                {summary.formulaSheet?.length > 0 && (
                  <SummarySection title="Formula Sheet">
                    <ul className="space-y-1.5">
                      {summary.formulaSheet.map((formula, i) => (
                        <li
                          key={i}
                          className="rounded-lg bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
                        >
                          {formula}
                        </li>
                      ))}
                    </ul>
                  </SummarySection>
                )}

                <SummarySection title="Mind Map">
                  <MarkdownContent content={summary.mindMap} />
                </SummarySection>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummarySection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-600">{title}</h3>
      {children}
    </section>
  );
}
