import { useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import ChatInput from "../components/chat/ChatInput";
import MessageBubble from "../components/chat/MessageBubble";
import TypingIndicator from "../components/chat/TypingIndicator";

const SUGGESTIONS = [
  "Explain how TCP and UDP differ",
  "Summarize the key points of DBMS normalization",
  "Write a Python function for binary search",
  "Give me 5 interview questions on Java OOP",
];

export default function Chat() {
  const {
    messages,
    isLoadingConversation,
    isSending,
    isRegenerating,
    activeConversationId,
    send,
    regenerate,
  } = useChat();

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const lastMessage = messages[messages.length - 1];
  const canRegenerate =
    activeConversationId && lastMessage?.role === "assistant" && !isSending && !isRegenerating;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">AI Chat Assistant</h1>
        <p className="text-sm text-slate-500">
          Ask academic, coding, or exam-prep questions and get step-by-step help.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {isLoadingConversation ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`h-16 max-w-[70%] animate-pulse rounded-2xl bg-slate-100 ${
                  i % 2 === 0 ? "" : "ml-auto"
                }`}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
            <div className="text-4xl">🎓</div>
            <h2 className="mt-3 text-xl font-semibold text-slate-800">
              What are you studying today?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ask a question, paste an error, or request a step-by-step explanation.
            </p>
            <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((m, idx) => (
              <MessageBubble key={m.id || `${m.role}-${idx}-${m.createdAt}`} message={m} />
            ))}
            {isSending && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 md:px-8">
        <div className="mx-auto max-w-3xl">
          {canRegenerate && (
            <div className="mb-2 flex justify-end">
              <button
                onClick={regenerate}
                disabled={isRegenerating}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                {isRegenerating ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
                    Regenerating...
                  </>
                ) : (
                  <>↻ Regenerate response</>
                )}
              </button>
            </div>
          )}
          <ChatInput onSend={send} disabled={isSending || isLoadingConversation} />
        </div>
      </div>
    </div>
  );
}
