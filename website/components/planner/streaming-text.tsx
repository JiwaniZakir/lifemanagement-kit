'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') ?? '';

  const handleCopy = () => {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-3 rounded-lg border border-[#ffffff0d] bg-[#0a0a0f]">
      <div className="flex items-center justify-between border-b border-[#ffffff0d] px-3 py-1.5">
        <span className="text-[10px] font-light uppercase tracking-wider text-[#fff4]">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-[#fff4] transition-colors hover:text-[#fff9]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-[1.6]">
        <code className="font-mono text-[#fffc]">{children}</code>
      </pre>
    </div>
  );
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  if (!text) return null;

  return (
    <div className="planner-markdown max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 text-[18px] font-normal text-white first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-[16px] font-normal text-white first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-[14px] font-medium text-white first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-3 text-[13px] font-bold text-[#fffc]">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-[13px] font-light leading-[1.7] text-[#fffc]">{children}</p>
          ),
          li: ({ children }) => (
            <li className="mb-1 text-[13px] font-light leading-[1.7] text-[#fffc]">{children}</li>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal pl-5">{children}</ol>
          ),
          strong: ({ children }) => (
            <strong className="font-medium text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-[#fff9]">{children}</em>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.startsWith('language-');
            if (isBlock) {
              return <CodeBlock className={className}>{String(children)}</CodeBlock>;
            }
            return (
              <code className="rounded border border-[#ffffff0d] bg-[#ffffff08] px-1.5 py-0.5 font-mono text-[12px] text-[#fffc]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            // Let CodeBlock handle pre styling
            return <>{children}</>;
          },
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-[#ffffff0d]">
              <table className="w-full text-[12px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-[#ffffff0d] bg-[#ffffff08] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[#fff9]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[#ffffff08] px-3 py-2 font-light text-[#fffc]">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-[#7c6aef] pl-4 text-[13px] italic text-[#fff9]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-[#ffffff0d]" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7c6aef] underline decoration-[#7c6aef40] underline-offset-2 transition-colors hover:text-[#9b8df7]"
            >
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
      {isStreaming && <span className="streaming-cursor" />}
    </div>
  );
}
