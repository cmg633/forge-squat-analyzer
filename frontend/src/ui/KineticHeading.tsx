import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SelectionBox } from './SelectionBox';

interface WordItem {
  text: string;
  italic?: boolean;
  box?: boolean;
}

const HERO_WORDS: WordItem[] = [
  { text: 'SINCE', italic: false },
  { text: 'WHEN', italic: true },
  { text: 'IS', italic: false },
  { text: 'FORM', italic: true, box: true },
  { text: 'OPTIONAL?', italic: false },
];

export const KineticHeading: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <motion.h1
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`type-display select-none flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-[clamp(2.5rem,7.5vw,5.5rem)] ${className}`}
    >
      {HERO_WORDS.map((item, idx) => {
        const isItalic = hoveredIdx === idx ? !item.italic : item.italic;

        const wordNode = (
          <span
            key={idx}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`inline-block transition-colors duration-150 ${
              isItalic ? 'italic text-[#CCFF00]' : 'not-italic text-[var(--text)]'
            }`}
          >
            {item.text}
          </span>
        );

        if (item.box) {
          return (
            <SelectionBox key={idx} color="magenta" cornerSize={6} className="inline-block">
              {wordNode}
            </SelectionBox>
          );
        }

        return wordNode;
      })}
    </motion.h1>
  );
};
