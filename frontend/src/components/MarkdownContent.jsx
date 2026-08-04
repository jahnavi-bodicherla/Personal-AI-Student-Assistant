import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";

function CodeBlock({ inline, className, children }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const codeText = String(children).replace(/\n$/, "");

  if (inline) {
    return (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.85em] text-brand-700">
        {codeText}
      </code>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-slate-700/50">
      <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
        <span>{match?.[1] || "code"}</span>
        <button
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-xs text-slate-300 transition hover:bg-slate-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={match?.[1] || "text"}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.85rem" }}
      >
        {codeText}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MarkdownContent({ content, className = "" }) {
  return (
    <div className={`prose prose-sm max-w-none prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          a: (props) => (
            <a {...props} target="_blank" rel="noreferrer" className="text-brand-600 underline" />
          ),
          table: (props) => (
            <div className="overflow-x-auto">
              <table {...props} className="border-collapse text-sm" />
            </div>
          ),
          th: (props) => <th {...props} className="border border-slate-200 bg-slate-50 px-2 py-1 text-left" />,
          td: (props) => <td {...props} className="border border-slate-200 px-2 py-1" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
