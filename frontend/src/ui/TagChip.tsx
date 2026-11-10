import React from 'react';

interface TagChipProps {
  label: string;
  variant?: 'lime' | 'magenta' | 'violet' | 'yellow' | 'outline';
  className?: string;
}

const variantStyles: Record<NonNullable<TagChipProps['variant']>, string> = {
  outline: 'border-[var(--hairline)] text-[var(--text)]/80 bg-[var(--bg)]',
  lime: 'border-[#CCFF00] bg-[#CCFF00] text-[#0A0A0A] font-bold',
  magenta: 'border-[#F040B8] bg-[#F040B8] text-[#0A0A0A] font-bold',
  violet: 'border-[#A97BFF] bg-[#A97BFF] text-[#0A0A0A] font-bold',
  yellow: 'border-[#F5FF00] bg-[#F5FF00] text-[#0A0A0A] font-bold',
};

export const TagChip: React.FC<TagChipProps> = ({
  label,
  variant = 'outline',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 border font-pixel text-[10px] uppercase tracking-wider leading-none select-none ${variantStyles[variant]} ${className}`}
    >
      {label}
    </span>
  );
};
