'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { analytics } from '@/lib/analytics';

const MAX_POLL_ATTEMPTS = 30; // 30 attempts * 10s = 5 minutes

interface WhatsAppPairingProps {
  instanceId: string;
}

export function WhatsAppPairing({ instanceId }: WhatsAppPairingProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paired, setPaired] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const pollCount = useRef(0);

  const fetchQR = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/instances/${instanceId}/whatsapp/qr`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.paired) {
          setPaired(true);
          return;
        }
        setError(data.error ?? 'Failed to get QR code.');
        return;
      }

      const data = await res.json();
      if (data.paired) {
        setPaired(true);
      } else if (data.qr) {
        setQrData(data.qr);
      }
    } catch {
      setError('Could not reach instance.');
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  const resetPolling = useCallback(() => {
    pollCount.current = 0;
    setTimedOut(false);
    setError('');
    fetchQR();
  }, [fetchQR]);

  useEffect(() => {
    analytics.whatsappPairingStarted();
    fetchQR();
  }, [fetchQR]);

  // Poll for pairing status while QR is showing
  useEffect(() => {
    if (!qrData || paired || timedOut) return;
    const interval = setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current >= MAX_POLL_ATTEMPTS) {
        setTimedOut(true);
        setError('Could not connect to instance. Please check that your instance is running.');
        clearInterval(interval);
        return;
      }
      fetchQR();
    }, 10000);
    return () => clearInterval(interval);
  }, [qrData, paired, timedOut, fetchQR]);

  useEffect(() => {
    if (paired) {
      analytics.whatsappPaired();
    }
  }, [paired]);

  if (paired) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 text-center">
        <div className="mb-2 text-2xl">&#9989;</div>
        <h3 className="text-[14px] font-medium text-green-400">WhatsApp Connected</h3>
        <p className="mt-1 text-[11px] text-[#fff6]">
          Your Aegis agents are ready to message you.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-6 backdrop-blur-xl">
      <h3 className="mb-3 text-[14px] font-medium text-white">Pair WhatsApp</h3>
      <p className="mb-4 text-[11px] font-light text-[#fff6]">
        Scan this QR code with WhatsApp to connect your phone.
      </p>

      <div className="flex items-center justify-center rounded-lg bg-white p-4">
        {loading && !qrData ? (
          <div className="flex h-48 w-48 items-center justify-center">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#7c6aef]" />
          </div>
        ) : error ? (
          <div className="flex h-48 w-48 flex-col items-center justify-center text-center">
            <p className="text-[12px] text-red-500">{error}</p>
            <button
              onClick={resetPolling}
              className="mt-2 text-[11px] text-[#7c6aef] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : qrData ? (
          <QRCodeSVG value={qrData} size={192} />
        ) : null}
      </div>

      <p className="mt-3 text-center text-[10px] text-[#fff4]">
        QR code refreshes automatically. Open WhatsApp &rarr; Linked Devices &rarr; Link a Device.
      </p>
    </div>
  );
}
