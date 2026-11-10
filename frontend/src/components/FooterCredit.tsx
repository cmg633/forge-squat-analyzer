import React, { useState } from 'react';
import { ArrowUp, Github, Linkedin, ExternalLink } from 'lucide-react';
import { SelectionBox } from '../ui/SelectionBox';
import { TagChip } from '../ui/TagChip';
import { Button, ButtonLink } from '../ui/Button';
import { useTheme } from '../hooks/useTheme';

const CREDIT_WORDS = ['@Chiranth', 'MG'];

export const FooterCredit: React.FC = () => {
  const { triggerPixelRain } = useTheme();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const githubUrl = import.meta.env.VITE_GITHUB_URL;
  const linkedinUrl = import.meta.env.VITE_LINKEDIN_URL;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#0A0A0A] text-[#F4F4EE] border-t border-[var(--hairline)] relative overflow-hidden pb-24 md:pb-12">
      <div
        aria-hidden="true"
        className="w-full h-2 border-b border-[var(--hairline)] opacity-50"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(204,255,0,0.45) 0 12px, transparent 12px 24px, rgba(240,64,184,0.45) 24px 36px, transparent 36px 48px)',
        }}
      />

      <div className="absolute inset-0 pointer-events-none opacity-20 grid-hairlines-12" aria-hidden="true" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--hairline)] pb-4">
          <span className="type-eyebrow text-[#CCFF00]">DESIGNED + ENGINEERED</span>
          <span className="type-mono text-[var(--text)]/70">
            ISE / Jyothy Institute of Technology / Bengaluru / 2026
          </span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <TagChip label="AI Squat Analysis" variant="outline" />
          <TagChip label="Reference Pages 1–35" variant="outline" />
          <TagChip label="No Mocks" variant="lime" />
        </div>

        <div className="space-y-2 py-2">
          <div className="font-display font-black text-2xl sm:text-4xl uppercase tracking-tightest text-[var(--text)]/50 leading-none">
            BUILT BY
          </div>

          <div className="inline-block max-w-full">
            <SelectionBox color="magenta" cornerSize={8} className="inline-block max-w-full">
              <div
                onClick={triggerPixelRain}
                className="p-2 sm:p-4 bg-[#0A0A0A] cursor-pointer select-none"
                role="button"
                tabIndex={0}
                aria-label="Built by @Chiranth MG"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerPixelRain();
                  }
                }}
              >
                <h2 className="font-display font-black uppercase tracking-tightest leading-[0.9] text-[clamp(1.85rem,8.4vw,8rem)]">
                  {CREDIT_WORDS.map((word, wIdx) => (
                    <React.Fragment key={word}>
                      {wIdx > 0 && ' '}
                      <span className="inline-flex whitespace-nowrap">
                        {word.split('').map((char, cIdx) => {
                          const key = `${wIdx}-${cIdx}`;
                          const isHovered = hoveredKey === key;
                          return (
                            <span
                              key={key}
                              onMouseEnter={() => setHoveredKey(key)}
                              onMouseLeave={() => setHoveredKey(null)}
                              className={`inline-block transition-colors duration-150 ${
                                isHovered ? 'italic text-[#F040B8]' : 'not-italic text-[#CCFF00]'
                              }`}
                            >
                              {char}
                            </span>
                          );
                        })}
                      </span>
                    </React.Fragment>
                  ))}
                </h2>
              </div>
            </SelectionBox>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--hairline)]">
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink to="/about" variant="ghost" size="sm" className="px-0">
              Methodology &amp; Criteria
            </ButtonLink>

            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-secondary"
              >
                <Github size={14} />
                <span>GitHub</span>
                <ExternalLink size={10} className="opacity-60" />
              </a>
            )}

            {linkedinUrl && (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-secondary"
              >
                <Linkedin size={14} />
                <span>LinkedIn</span>
                <ExternalLink size={10} className="opacity-60" />
              </a>
            )}
          </div>

          <Button variant="primary" size="sm" onClick={scrollToTop} aria-label="Back to top">
            <ArrowUp size={14} strokeWidth={2.5} />
            <span>Back to top</span>
          </Button>
        </div>
      </div>
    </footer>
  );
};
