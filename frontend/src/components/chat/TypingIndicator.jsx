import { useEffect, useState } from "react";
import AssistantMark from "../AssistantMark";

/**
 * Shown while the assistant is generating a reply.
 *
 * Kept at this path and default-exported under the same name so the existing
 * imports in Chat.jsx and NoteDetail.jsx keep working untouched.
 *
 * The label advances after a few seconds because a long wait with a frozen
 * caption reads as a hang, whereas changing text reads as progress.
 */
const STAGES = [
  { label: "Thinking", after: 0 },
  { label: "Working through it", after: 4000 },
  { label: "Putting it together", after: 9000 },
];

export default function TypingIndicator() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = STAGES.slice(1).map((s, i) =>
      setTimeout(() => setStage(i + 1), s.after)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <AssistantMark size={28} thinking />

        <span className="flex items-baseline gap-1">
          <span className="bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700 bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent [animation:shimmer_2s_linear_infinite]">
            {STAGES[stage].label}
          </span>
          {/* Dots animate independently of the label so motion never stops. */}
          <span className="flex gap-0.5 pb-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1 w-1 animate-bounce rounded-full bg-brand-400"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}
