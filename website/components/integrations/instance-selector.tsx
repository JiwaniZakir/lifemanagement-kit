'use client';

import { useState } from 'react';
import { IntegrationGrid } from './integration-grid';

interface Instance {
  id: string;
  name: string;
  provider: string;
  status: string;
}

export function InstanceSelector({ instances }: { instances: Instance[] }) {
  const [selectedId, setSelectedId] = useState(instances[0]?.id ?? '');

  return (
    <div>
      {instances.length > 1 && (
        <div className="mb-6 flex items-center gap-3">
          <label htmlFor="instance-select" className="text-[12px] text-[#fff6]">
            Instance
          </label>
          <select
            id="instance-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-[#ffffff14] bg-[#ffffff08] px-3 py-1.5 text-[12px] text-white outline-none focus:border-[#7c6aef66] [&>option]:bg-[#1a1a2e] [&>option]:text-white"
          >
            {instances.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.provider})
              </option>
            ))}
          </select>
        </div>
      )}

      {instances.length === 1 && (
        <div className="mb-6">
          <span className="rounded-md bg-[#ffffff0d] px-2 py-1 text-[11px] text-[#fff6]">
            {instances[0].name}
          </span>
        </div>
      )}

      <IntegrationGrid instanceId={selectedId} />
    </div>
  );
}
