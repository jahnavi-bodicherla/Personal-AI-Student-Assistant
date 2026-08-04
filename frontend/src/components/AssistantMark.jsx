/**
 * The assistant's logo mark: an open book with a spark above it.
 *
 * Inline SVG rather than an image file so it inherits the brand colours,
 * scales cleanly at any size, and needs no asset pipeline.
 *
 * `thinking` adds a slow orbiting ring and a pulsing spark, so the same mark
 * doubles as the loading animation.
 */
export default function AssistantMark({ size = 28, thinking = false, className = "" }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {thinking && (
        <>
          {/* Soft halo that breathes underneath the mark. */}
          <span className="absolute inset-0 animate-ping rounded-xl bg-brand-400/30 [animation-duration:1.8s]" />
          {/* Orbiting arc: one visible border edge on a spinning circle. */}
          <span className="absolute -inset-1 animate-spin rounded-full border-2 border-transparent border-t-brand-500 [animation-duration:1.1s]" />
        </>
      )}

      <span className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: size * 0.62, height: size * 0.62 }}
          aria-hidden="true"
        >
          {/* Open book */}
          <path
            d="M3 6.2c2.6-.9 5.1-.9 7.6.2.3.1.4.4.4.7v10.4c0 .5-.5.8-1 .6-2.3-.9-4.5-.9-6.7-.2a.6.6 0 0 1-.8-.6V6.9c0-.3.2-.6.5-.7Z"
            fill="white"
            fillOpacity="0.95"
          />
          <path
            d="M21 6.2c-2.6-.9-5.1-.9-7.6.2-.3.1-.4.4-.4.7v10.4c0 .5.5.8 1 .6 2.3-.9 4.5-.9 6.7-.2a.6.6 0 0 0 .8-.6V6.9a.7.7 0 0 0-.5-.7Z"
            fill="white"
            fillOpacity="0.7"
          />
          {/* Spark — pulses while the assistant is working. */}
          <path
            d="M17.6 2.2l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z"
            fill="white"
            className={thinking ? "animate-pulse" : ""}
          />
        </svg>
      </span>
    </span>
  );
}
