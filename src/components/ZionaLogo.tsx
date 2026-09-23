import React from 'react';
import Image from 'next/image';

interface ZionaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'full' | 'icon';
  theme?: 'light' | 'dark';
  showSubtext?: boolean;
}

export const ZionaLogo: React.FC<ZionaLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  theme = 'light',
  showSubtext = true,
}) => {
  const sizeMap = {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
  };

  const finalSize = typeof size === 'number' ? size : sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* 3D Ziona Badge */}
      <div
        className="relative overflow-hidden rounded-xl shadow-md shadow-indigo-500/20 shrink-0 bg-slate-950 flex items-center justify-center p-0.5"
        style={{ width: finalSize, height: finalSize }}
      >
        <img
          src="/ziona.png"
          alt="Ziona Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {variant === 'full' && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center">
            <span className={`font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'} text-base`}>
              Ziona <span className="text-indigo-600">POS</span>
            </span>
            <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
              ERP
            </span>
          </div>
          {showSubtext && (
            <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
              by ZaayaSoft
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ZionaLogo;
