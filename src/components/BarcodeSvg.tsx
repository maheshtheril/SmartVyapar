'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeSvgProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

export default function BarcodeSvg({
  value,
  width = 1.3,
  height = 28,
  displayValue = true,
  fontSize = 9,
}: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          font: 'monospace',
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn('Invalid barcode value:', value, err);
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  if (!value) return null;

  return <svg ref={svgRef} className="inline-block max-w-full" />;
}
