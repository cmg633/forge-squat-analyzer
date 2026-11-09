import { motion } from 'framer-motion';
import { ShieldCheck, BookOpen, Eye, Cpu, FileCode2, Scale } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div className="space-y-2 border-b border-forge-border pb-4">
        <span className="eyebrow">METHODOLOGY & ARCHITECTURE</span>
        <h1 className="display-heading text-3xl sm:text-4xl text-white">
          ABOUT FORGE SQUAT ANALYSER
        </h1>
        <p className="text-forge-grey text-sm max-w-2xl leading-relaxed">
          Forge is an evidence-grounded computer-vision application designed to evaluate barbell squat mechanics with strict scientific honesty and zero hallucinated precision.
        </p>
      </div>

      {/* Philosophy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-forge-border space-y-2">
          <BookOpen className="text-forge-red" size={22} />
          <h3 className="font-display font-bold text-lg uppercase text-white">
            Single Source of Truth
          </h3>
          <p className="text-xs text-forge-grey leading-relaxed">
            All assessment logic is derived exclusively from pages 1–35 of the standard reference text. We do not invent arbitrary thresholds or ungrounded scoring rubrics.
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-forge-border space-y-2">
          <Scale className="text-forge-red" size={22} />
          <h3 className="font-display font-bold text-lg uppercase text-white">
            Deterministic Engine
          </h3>
          <p className="text-xs text-forge-grey leading-relaxed">
            Assessments are computed deterministically via <code className="text-forge-red">squat_skill.yaml</code>. The LLM only writes motivating prose and is forbidden from altering verdicts.
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-forge-border space-y-2">
          <Eye className="text-forge-red" size={22} />
          <h3 className="font-display font-bold text-lg uppercase text-white">
            Honest Uncertainty
          </h3>
          <p className="text-xs text-forge-grey leading-relaxed">
            If a mechanical fault cannot be assessed from a side-view (such as knee caving or stance width), the system explicitly reports <em>cannot assess</em> with a clear explanation.
          </p>
        </div>
      </div>

      {/* Criteria Table */}
      <div className="glass-card p-6 rounded-2xl border border-forge-border space-y-4">
        <div>
          <span className="eyebrow">ASSESSMENT SPECIFICATION</span>
          <h2 className="display-heading text-2xl text-white">CRITERIA COVERAGE</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-forge-border text-forge-grey font-display uppercase tracking-wider">
                <th className="py-2.5 pr-4">Criterion</th>
                <th className="py-2.5 px-4">Citation</th>
                <th className="py-2.5 px-4">Side-View Assessable?</th>
                <th className="py-2.5 pl-4">Measurement Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-border/60">
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Squat Depth</td>
                <td className="py-3 px-4 text-forge-grey">p. 7, Fig 2-1</td>
                <td className="py-3 px-4"><span className="badge badge-green">YES</span></td>
                <td className="py-3 pl-4 text-forge-grey">Hip crease landmark y &gt; knee landmark y at rep bottom (estimate)</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Back / Torso Angle</td>
                <td className="py-3 px-4 text-forge-grey">p. 13, Fig 2-13</td>
                <td className="py-3 px-4"><span className="badge badge-green">YES</span></td>
                <td className="py-3 pl-4 text-forge-grey">Shoulder-to-hip vector angle relative to horizontal (~45° ±10° assumption)</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Bar Over Midfoot</td>
                <td className="py-3 px-4 text-forge-grey">p. 10, Fig 2-7</td>
                <td className="py-3 px-4"><span className="badge badge-green">YES</span></td>
                <td className="py-3 pl-4 text-forge-grey">CSRT tracked bar x vs heel-to-toe midpoint x through full ROM</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Hip Drive</td>
                <td className="py-3 px-4 text-forge-grey">p. 18, Chapter text</td>
                <td className="py-3 px-4"><span className="badge badge-green">YES</span></td>
                <td className="py-3 pl-4 text-forge-grey">Vertical rise velocity of hips vs shoulders in first 30% of ascent</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Eye Gaze</td>
                <td className="py-3 px-4 text-forge-grey">p. 20, Chapter text</td>
                <td className="py-3 px-4"><span className="badge badge-green">YES</span></td>
                <td className="py-3 pl-4 text-forge-grey">Nose-to-ear angle proxy for downward floor gaze (estimate)</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Stance Width</td>
                <td className="py-3 px-4 text-forge-grey">p. 6, Chapter text</td>
                <td className="py-3 px-4"><span className="badge badge-grey">CANNOT ASSESS</span></td>
                <td className="py-3 pl-4 text-forge-grey">Feet overlap in sagittal projection; requires frontal view</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Toe Angle (~30°)</td>
                <td className="py-3 px-4 text-forge-grey">p. 6, Chapter text</td>
                <td className="py-3 px-4"><span className="badge badge-grey">CANNOT ASSESS</span></td>
                <td className="py-3 pl-4 text-forge-grey">Transverse plane angle flattened in 2D side camera</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Knee Tracking / Caving</td>
                <td className="py-3 px-4 text-forge-grey">p. 8, Chapter text</td>
                <td className="py-3 px-4"><span className="badge badge-grey">CANNOT ASSESS</span></td>
                <td className="py-3 pl-4 text-forge-grey">Valgus collapse occurs along medial axis; invisible from pure side</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Bar Position on Back</td>
                <td className="py-3 px-4 text-forge-grey">p. 24, Fig 2-19</td>
                <td className="py-3 px-4"><span className="badge badge-grey">CANNOT ASSESS</span></td>
                <td className="py-3 pl-4 text-forge-grey">Scapular spine shelf requires rear or combined view</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Grip Width</td>
                <td className="py-3 px-4 text-forge-grey">p. 23, Chapter text</td>
                <td className="py-3 px-4"><span className="badge badge-grey">CANNOT ASSESS</span></td>
                <td className="py-3 pl-4 text-forge-grey">Requires frontal or posterior camera placement</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="glass-card p-6 rounded-2xl border border-forge-border space-y-4">
        <div>
          <span className="eyebrow">ENGINEERING STACK</span>
          <h2 className="display-heading text-2xl text-white">HOW IT'S BUILT</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-forge-grey">
          <div className="space-y-1 p-3 rounded-xl bg-forge-surface border border-forge-border">
            <span className="text-white font-semibold block">Computer Vision & Kinematics</span>
            <p>MediaPipe Pose (33 landmarks, model complexity 1), Savitzky-Golay filtering, OpenCV CSRT barbell tracker, and SciPy peak detection.</p>
          </div>
          <div className="space-y-1 p-3 rounded-xl bg-forge-surface border border-forge-border">
            <span className="text-white font-semibold block">Backend Architecture</span>
            <p>FastAPI async queue with in-memory job store, automatic 6h TTL ephemeral cleanup, and hot-reloadable PyYAML rules engine.</p>
          </div>
          <div className="space-y-1 p-3 rounded-xl bg-forge-surface border border-forge-border">
            <span className="text-white font-semibold block">Frontend & PWA</span>
            <p>React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Recharts, and IndexedDB for local offline history preservation.</p>
          </div>
          <div className="space-y-1 p-3 rounded-xl bg-forge-surface border border-forge-border">
            <span className="text-white font-semibold block">Coaching Agent</span>
            <p>Provider-swappable LLM (Gemini 1.5 Flash default / Anthropic Haiku) with strict deterministic pydantic validation and template fallback.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

