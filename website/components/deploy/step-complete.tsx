'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDeployStore } from '@/lib/stores/deploy-store';

export function StepComplete() {
  const { mode, instanceName, instanceId, serverIp, tunnelDomain } = useDeployStore();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(null), 2000);
    });
  };

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="glass p-8">
        <div className="mb-4 text-4xl text-green-400">{'\u2713'}</div>
        <h3 className="mb-1 text-[18px] font-normal text-white">
          {mode === 'local' ? 'Bundle Downloaded!' : 'Aegis Deployed!'}
        </h3>
        <p className="mb-6 text-[13px] font-light text-[#fff9]">
          {mode === 'local'
            ? 'Follow these steps to get your instance running.'
            : `Your instance "${instanceName}" is up and running.`}
        </p>

        {mode === 'local' && (
          <div className="mb-6 space-y-4 text-left">
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7c6aef] text-[11px] font-medium text-white">
                  1
                </span>
                <div>
                  <p className="text-[13px] text-white">Extract the ZIP file</p>
                  <p className="mt-0.5 text-[11px] text-[#fff6]">
                    Unzip the downloaded bundle into your preferred directory.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7c6aef] text-[11px] font-medium text-white">
                  2
                </span>
                <div>
                  <p className="text-[13px] text-white">Configure your environment</p>
                  <p className="mt-0.5 text-[11px] text-[#fff6]">
                    Copy{' '}
                    <code className="rounded bg-[#ffffff0d] px-1 py-0.5 font-mono text-[10px] text-[#7c6aef]">
                      .env.example
                    </code>{' '}
                    to{' '}
                    <code className="rounded bg-[#ffffff0d] px-1 py-0.5 font-mono text-[10px] text-[#7c6aef]">
                      .env
                    </code>{' '}
                    and add your API credentials.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7c6aef] text-[11px] font-medium text-white">
                  3
                </span>
                <div>
                  <p className="text-[13px] text-white">Start the services</p>
                  <p className="mt-1 text-[11px] text-[#fff6]">
                    Run this command in the extracted directory:
                  </p>
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-[#ffffff0d] bg-[#ffffff05] px-3 py-2">
                    <code className="font-mono text-[12px] text-white">docker compose up -d</code>
                    <button
                      onClick={() => handleCopy('docker compose up -d', 'docker')}
                      className="ml-2 shrink-0 text-[10px] text-[#7c6aef] hover:text-[#9b8df2]"
                    >
                      {copiedItem === 'docker' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7c6aef] text-[11px] font-medium text-white">
                  4
                </span>
                <div>
                  <p className="text-[13px] text-white">Open your instance</p>
                  <p className="mt-0.5 text-[11px] text-[#fff6]">
                    Visit{' '}
                    <code className="rounded bg-[#ffffff0d] px-1 py-0.5 font-mono text-[10px] text-[#7c6aef]">
                      http://localhost:18789
                    </code>{' '}
                    in your browser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'hetzner' && (
          <div className="mb-6 space-y-3 text-left">
            {serverIp && (
              <div className="flex items-center justify-between rounded-lg border border-[#ffffff0d] bg-[#ffffff05] px-3 py-2">
                <div>
                  <p className="text-[10px] text-[#fff4]">Server IP</p>
                  <p className="text-[12px] text-white">{serverIp}</p>
                </div>
                <button
                  onClick={() => handleCopy(serverIp, 'ip')}
                  className="text-[10px] text-[#7c6aef]"
                >
                  {copiedItem === 'ip' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}

            {tunnelDomain && (
              <div className="flex items-center justify-between rounded-lg border border-[#ffffff0d] bg-[#ffffff05] px-3 py-2">
                <div>
                  <p className="text-[10px] text-[#fff4]">Instance URL</p>
                  <a
                    href={`https://${tunnelDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[#7c6aef] underline decoration-[#7c6aef33] underline-offset-2 hover:text-[#9b8df2] hover:decoration-[#9b8df266]"
                  >
                    https://{tunnelDomain}
                  </a>
                </div>
                <button
                  onClick={() => handleCopy(`https://${tunnelDomain}`, 'url')}
                  className="text-[10px] text-[#7c6aef]"
                >
                  {copiedItem === 'url' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {instanceId && (
            <Link
              href={`/dashboard/instances/${instanceId}`}
              className="block rounded-lg bg-[#7c6aef] px-4 py-2.5 text-[12px] font-medium text-white transition-all hover:bg-[#6b5bd6]"
            >
              Go to Dashboard
            </Link>
          )}
          <Link
            href="/dashboard"
            className="block rounded-lg border border-[#ffffff14] px-4 py-2.5 text-[12px] font-light text-[#fffc] transition-all hover:border-[#ffffff26] hover:text-white"
          >
            View All Instances
          </Link>
        </div>
      </div>
    </div>
  );
}
