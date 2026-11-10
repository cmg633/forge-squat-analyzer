import React from 'react';

interface PixelTileProps {
  children: React.ReactNode;
  className?: string;
  headerTag?: string;
  headerRight?: React.ReactNode;
}

export const PixelTile: React.FC<PixelTileProps> = ({
  children,
  className = '',
  headerTag,
  headerRight,
}) => {
  return (
    <div className={`bg-[var(--card-bg)] border border-[var(--hairline)] ${className}`}>
      {(headerTag || headerRight) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--hairline)] bg-[var(--bg)]">
          {headerTag && (
            <span className="type-eyebrow text-[#CCFF00]">{headerTag}</span>
          )}
          {headerRight && (
            <div className="type-mono text-[var(--text)]/60">{headerRight}</div>
          )}
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
};
