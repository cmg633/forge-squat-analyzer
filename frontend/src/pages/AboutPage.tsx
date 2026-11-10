import React from 'react';
import { BookOpen, Eye, Scale } from 'lucide-react';
import { PixelTile } from '../ui/PixelTile';
import { TagChip } from '../ui/TagChip';

const CRITERIA_ROWS = [
  { criterion: 'Hip crease below patella', page: 'p. 7, Fig 2-1', assessable: true, note: 'Observed hip vs knee Y at bottom (±5 px tolerance).' },
  { criterion: 'Back angle (~45°)', page: 'p. 13, Fig 2-13', assessable: true, note: 'Observed torso angle (35°–55° range is an assumption).' },
  { criterion: 'Bar over midfoot', page: 'p. 10, Fig 2-7', assessable: true, note: 'Observed bar X vs midfoot (40 px at 1080p assumption).' },
  { criterion: 'Bar path vertical', page: 'p. 10, Fig 2-7', assessable: true, note: 'Observed bar X std dev (25 px max assumption).' },
  { criterion: 'Hip drive', page: 'p. 18', assessable: true, note: 'Estimated hip vs shoulder rise in early ascent.' },
  { criterion: 'Eye gaze (4–5 ft down)', page: 'p. 20', assessable: true, note: 'Estimated nose–ear tilt proxy (low confidence).' },
  { criterion: 'Knee flexion angle', page: 'p. 7, Fig 2-1', assessable: true, note: 'Observed bottom knee angle (informational only).' },
  { criterion: 'Shoulder-width stance', page: 'p. 6', assessable: false, note: 'Feet overlap in side view; needs front view.' },
  { criterion: 'Toes out ~30°', page: 'p. 6', assessable: false, note: 'Transverse angle hidden in side view.' },
  { criterion: 'Knees track over feet', page: 'p. 8', assessable: false, note: 'Medial knee collapse invisible from side.' },
  { criterion: 'Grip & wrist position', page: 'p. 23', assessable: false, note: 'Hand width requires front or rear view.' },
  { criterion: 'Bar on scapular spine', page: 'p. 24, Fig 2-19', assessable: false, note: 'Shelf placement requires rear view.' },
];

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      <div className="space-y-2 border-b border-[var(--hairline)] pb-4">
        <div className="type-eyebrow text-[#CCFF00]">Methodology</div>
        <h1 className="type-h2">Rules and transparency</h1>
        <p className="type-body text-[var(--text)]/75 max-w-2xl">
          Every verdict runs deterministically against Starting Strength pages 1–35 without ungrounded scores.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <PixelTile headerTag="Source of truth" className="md:col-span-4">
          <BookOpen className="text-[#CCFF00] mb-3" size={20} />
          <h2 className="type-h3 mb-1">Starting Strength pp. 1–35</h2>
          <p className="type-small text-[var(--text)]/75">
            Every rule cites the exact page, figure, and quote from the reference chapter.
          </p>
        </PixelTile>

        <PixelTile headerTag="Deterministic vs LLM" className="md:col-span-4">
          <Scale className="text-[#F040B8] mb-3" size={20} />
          <h2 className="type-h3 mb-1">Fixed YAML rules</h2>
          <p className="type-small text-[var(--text)]/75">
            Rules execute deterministically. Optional LLM coaching only writes text from verified verdicts.
          </p>
        </PixelTile>

        <PixelTile headerTag="Honest uncertainty" className="md:col-span-4">
          <Eye className="text-[#A97BFF] mb-3" size={20} />
          <h2 className="type-h3 mb-1">Assumptions tagged</h2>
          <p className="type-small text-[var(--text)]/75">
            Frontal views stay Cannot Assess, and numeric tolerances carry Assumption labels.
          </p>
        </PixelTile>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2">
          <span className="type-eyebrow text-[#CCFF00]">12-Criterion Specification</span>
          <span className="type-mono text-[var(--text)]/60">skill/squat_skill.yaml</span>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block border border-[var(--hairline)] bg-[var(--card-bg)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--hairline)] bg-[var(--bg)] font-pixel text-[10px] text-[#CCFF00] uppercase">
                <th className="py-3 px-4">Criterion</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Side-view</th>
                <th className="py-3 px-4">Measurement &amp; assumptions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hairline)] type-small text-[var(--text)]/85">
              {CRITERIA_ROWS.map((row) => (
                <tr key={row.criterion}>
                  <td className="py-3 px-4 font-semibold text-[var(--text)]">{row.criterion}</td>
                  <td className="py-3 px-4 type-mono text-[#A97BFF] whitespace-nowrap">{row.page}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <TagChip
                      label={row.assessable ? 'Assessable' : 'Cannot assess'}
                      variant={row.assessable ? 'lime' : 'violet'}
                    />
                  </td>
                  <td className="py-3 px-4 text-[var(--text)]/75">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (Zero Horizontal Clipping) */}
        <div className="md:hidden space-y-2">
          {CRITERIA_ROWS.map((row) => (
            <div key={row.criterion} className="p-4 border border-[var(--hairline)] bg-[var(--card-bg)] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="type-h3 text-[var(--text)]">{row.criterion}</span>
                <TagChip
                  label={row.assessable ? 'Assessable' : 'Cannot assess'}
                  variant={row.assessable ? 'lime' : 'violet'}
                />
              </div>
              <div className="type-mono text-[#A97BFF]">{row.page}</div>
              <p className="type-small text-[var(--text)]/75">{row.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
