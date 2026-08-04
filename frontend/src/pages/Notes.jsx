import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { deleteNote, fetchNotes, uploadNote } from "../services/notesService";
import { getErrorMessage } from "../utils/errorMessage";

const FILE_ICONS = {
  pdf: "📕",
  docx: "📘",
  txt: "📄",
  png: "✍️",
  jpg: "✍️",
  jpeg: "✍️",
  webp: "✍️",
};

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

const isHandwrittenFile = (name = "") =>
  IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isReadingHandwriting, setIsReadingHandwriting] = useState(false);
  const [subject, setSubject] = useState("");
  const fileInputRef = useRef(null);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await fetchNotes();
      setNotes(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't load your notes."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const handwritten = isHandwrittenFile(file.name);
    setIsUploading(true);
    setIsReadingHandwriting(handwritten);
    try {
      await uploadNote(file, subject || undefined);
      toast.success(
        handwritten
          ? `Handwriting in "${file.name}" was read successfully.`
          : `"${file.name}" uploaded successfully.`
      );
      setSubject("");
      await loadNotes();
    } catch (err) {
      toast.error(getErrorMessage(err, "Upload failed."));
    } finally {
      setIsUploading(false);
      setIsReadingHandwriting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (e, noteId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.info("Note deleted.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete this note."));
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Upload Notes</h1>
        <p className="mt-1 text-slate-500">
          Upload PDF, DOCX, or TXT study material — or a photo of your handwritten
          notes — to ask questions or generate summaries.
        </p>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Subject (optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Computer Networks"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/60"
              />
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700">
              {isUploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {isReadingHandwriting ? "Reading handwriting..." : "Uploading..."}
                </>
              ) : (
                <>📤 Choose file</>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Documents: PDF, DOCX, TXT (max 15 MB) · Handwritten: PNG, JPG, WEBP (max 12 MB)
          </p>
          <p className="mt-1 text-xs text-slate-400">
            ✍️ Photograph the page straight on in good light — the AI reads the
            handwriting and converts it to text.
          </p>
        </div>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">Your notes</h2>

        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No notes uploaded yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {notes.map((note) => (
              <Link
                key={note.id}
                to={`/notes/${note.id}`}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="text-2xl">{FILE_ICONS[note.fileType] || "📄"}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{note.fileName}</p>
                    <p className="text-xs text-slate-400">
                      {note.subject || "General"} · {new Date(note.uploadDate).toLocaleDateString()}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {note.isHandwritten && (
                        <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          ✍️ Handwritten
                        </span>
                      )}
                      {note.hasSummary && (
                        <span className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                          Summary ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, note.id)}
                  className="hidden shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
                  title="Delete note"
                >
                  ✕
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
