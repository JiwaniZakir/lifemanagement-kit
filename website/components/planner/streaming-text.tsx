'use client';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  if (!text) return null;

  return (
    <div className="max-w-none text-sm leading-relaxed">
      <pre className="whitespace-pre-wrap font-sans text-[#ffffffcc]">
        {text}
        {isStreaming && (
          <span className="streaming-cursor" />
        )}
      </pre>
    </div>
  );
}
