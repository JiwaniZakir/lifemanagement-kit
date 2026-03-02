'use client';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  if (!text) return null;

  return (
    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
      <pre className="whitespace-pre-wrap font-sans text-zinc-300">
        {text}
        {isStreaming && (
          <span className="streaming-cursor" />
        )}
      </pre>
    </div>
  );
}
