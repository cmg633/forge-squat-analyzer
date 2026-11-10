import React from 'react';

interface SelectionBoxProps {
  children: React.ReactNode;
  active?: boolean;
  color?: 'magenta' | 'lime' | 'violet' | 'yellow' | 'white';
  label?: string;
  className?: string;
  cornerSize?: number;
}

const colorMap = {
  magenta: {
    border: 'border-[#F040B8]',
    bg: 'bg-[#F040B8]',
    tagBg: 'bg-[#F040B8] text-[#0A0A0A]',
  },
  lime: {
    border: 'border-[#CCFF00]',
    bg: 'bg-[#CCFF00]',
    tagBg: 'bg-[#CCFF00] text-[#0A0A0A]',
  },
  violet: {
    border: 'border-[#A97BFF]',
    bg: 'bg-[#A97BFF]',
    tagBg: 'bg-[#A97BFF] text-[#0A0A0A]',
  },
  yellow: {
    border: 'border-[#F5FF00]',
    bg: 'bg-[#F5FF00]',
    tagBg: 'bg-[#F5FF00] text-[#0A0A0A]',
  },
  white: {
    border: 'border-[#F4F4EE]',
    bg: 'bg-[#F4F4EE]',
    tagBg: 'bg-[#F4F4EE] text-[#0A0A0A]',
  },
};

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  children,
  active = true,
  color = 'magenta',
  label,
  className = '',
  cornerSize = 6,
}) => {
  const scheme = colorMap[color];

  if (!active) {
    return <div className={`relative ${className}`}>{children}</div>;
  }

  return (
    <div
      className={`relative p-1 border border-dashed ${scheme.border} ${className}`}
      style={{ isolation: 'isolate' }}
    >
      <span
        aria-hidden="true"
        className={`absolute -top-[3px] -left-[3px] ${scheme.bg} z-20`}
        style={{ width: cornerSize, height: cornerSize }}
      />
      <span
        aria-hidden="true"
        className={`absolute -top-[3px] -right-[3px] ${scheme.bg} z-20`}
        style={{ width: cornerSize, height: cornerSize }}
      />
      <span
        aria-hidden="true"
        className={`absolute -bottom-[3px] -left-[3px] ${scheme.bg} z-20`}
        style={{ width: cornerSize, height: cornerSize }}
      />
      <span
        aria-hidden="true"
        className={`absolute -bottom-[3px] -right-[3px] ${scheme.bg} z-20`}
        style={{ width: cornerSize, height: cornerSize }}
      />

      {label && (
        <span
          className={`absolute -top-3 left-2 px-1.5 py-0.5 font-pixel text-[9px] uppercase font-bold tracking-wider z-20 select-none ${scheme.tagBg}`}
        >
          {label}
        </span>
      )}

      {children}
    </div>
  );
};
