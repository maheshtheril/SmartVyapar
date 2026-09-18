'use client';

import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeCanvasProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QrCodeCanvas({ value, size = 120, className = '' }: QrCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        },
        (err) => {
          if (err) console.error('Error generating QR Code canvas:', err);
        }
      );
    }
  }, [value, size]);

  if (!value) return null;

  return <canvas ref={canvasRef} className={`inline-block ${className}`} />;
}
