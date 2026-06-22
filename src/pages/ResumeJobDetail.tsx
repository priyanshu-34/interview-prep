import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useResume } from '../hooks/useResume';
import { tailorLatex, pdfChecklist, isResumeAIEnabled, loadResumePrompts, type CustomPrompt } from '../lib/resumeAI';
import { openInOverleaf, downloadText } from '../lib/overleaf';
import { compileLatexToPdf } from '../lib/latexWasm';
import type { JobStatus, LatexVariant, ChecklistVariant } from '../types/resume';
import { JOB_STATUSES } from '../types/resume';

const card = 'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6';
const btn = 'inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 min-h-[44px]';
const btnGhost = 'inline-flex items-center justify-center rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50 min-h-[44px]';

export function ResumeJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { base, getJob, loading, setJobStatus, setJobNotes, setJobVariant, updateJob, deleteJob } = useResume();

  const [working, setWorking] = useState(false);
  const [wasmBusy, setWasmBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [promptId, setPromptId] = useState('');
  const [tweaks, setTweaks] = useState<string | null>(null);

  // Revoke the blob URL when it changes or the page unmounts.
  useEffect(() => () => { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); }, [pdfPreviewUrl]);

  // Load admin-defined custom tailor prompts (if any) for the picker.
  useEffect(() => { loadResumePrompts().then((p) => setCustomPrompts(p.custom)).catch(() => {}); }, []);

  if (loading) return <div className={card}>Loading…</div>;
  const job = jobId ? getJob(jobId) : null;
  if (!job) {
    return (
      <div className={card}>
        <p className="text-[var(--text)]">Job not found.</p>
        <Link to="/resume" className="text-[var(--accent)]">← Back to Resume</Link>
      </div>
    );
  }

  async function tailor() {
    if (!base) { setMsg('Set a base resume first.'); return; }
    if (!isResumeAIEnabled()) { setMsg('Add VITE_OPENAI_API_KEY to tailor.'); return; }
    setWorking(true); setMsg(null);
    try {
      if (base.format === 'latex' && base.latexSource) {
        const chosen = customPrompts.find((c) => c.id === promptId);
        const effectiveTweaks = (tweaks ?? job!.tweaks ?? '').trim();
        if (effectiveTweaks !== (job!.tweaks ?? '')) {
          try { await updateJob(job!.id, { tweaks: effectiveTweaks }); } catch { /* non-fatal */ }
        }
        const r = await tailorLatex(
          base.latexSource,
          { title: job!.title, company: job!.company, jdText: job!.jdText },
          { systemPrompt: chosen?.prompt, extraInstructions: effectiveTweaks }
        );
        await setJobVariant(job!.id, {
          format: 'latex',
          latexSource: r.latexSource,
          addedKeywords: r.addedKeywords,
          summary: r.summary,
          atsBefore: r.atsBefore,
          atsAfter: r.atsAfter,
        });
        setMsg('Tailored. Formatting preserved — only keywords/wording changed.');
      } else {
        const checklist = await pdfChecklist(base.rawText, { title: job!.title, company: job!.company, jdText: job!.jdText });
        await setJobVariant(job!.id, { format: 'checklist', checklist });
        setMsg('Checklist ready.');
      }
    } catch (e) { setMsg((e as Error).message); } finally { setWorking(false); }
  }

  async function tryWasm(latex: string) {
    setWasmBusy(true); setMsg(null);
    try {
      const blob = await compileLatexToPdf(latex);
      if (blob) {
        setPdfPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      } else {
        setMsg('In-browser PDF compile is unavailable in this browser — use "Open in Overleaf" instead.');
      }
    } finally { setWasmBusy(false); }
  }

  const variant = job.variant;

  return (
    <div className="space-y-6">
      <Link to="/resume" className="text-sm text-[var(--accent)] no-underline hover:underline">← Back to Resume</Link>

      <div className={card}>
        <h1 className="text-xl font-bold text-[var(--text)]">{job.title}</h1>
        <p className="text-[var(--text-muted)]">{[job.company, job.location].filter(Boolean).join(' · ') || '—'}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm text-[var(--text-muted)]">Status</label>
          <select
            value={job.status}
            onChange={(e) => setJobStatus(job.id, e.target.value as JobStatus)}
            className="min-h-[44px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-base sm:text-sm text-[var(--text)]"
          >
            {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => { deleteJob(job.id); navigate('/resume'); }} className="ml-auto min-h-[44px] px-2 text-sm text-red-400 hover:underline">
            Delete job
          </button>
        </div>
        <div className="mt-3">
          <label className="text-sm text-[var(--text-muted)]">Notes</label>
          <textarea
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base sm:text-sm text-[var(--text)]"
            rows={2}
            value={notesDraft ?? job.notes}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => { if (notesDraft !== null && notesDraft !== job.notes) setJobNotes(job.id, notesDraft); }}
            placeholder="Recruiter name, referral, follow-up date…"
          />
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-[var(--text)]">Tailor for this job</h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {base?.format === 'latex' && customPrompts.length > 0 && (
              <select
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
                title="Tailoring prompt"
                className="min-h-[44px] w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-base sm:w-auto sm:text-sm text-[var(--text)]"
              >
                <option value="">Default prompt</option>
                {customPrompts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <button className={`${btn} w-full sm:w-auto`} disabled={working} onClick={tailor}>
              {working ? 'Tailoring…' : variant ? 'Re-tailor' : 'Tailor resume'}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <label className="text-sm text-[var(--text-muted)]">Your tweaks for this job <span className="text-xs">(optional)</span></label>
          <textarea
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base sm:text-sm text-[var(--text)]"
            rows={3}
            value={tweaks ?? job.tweaks ?? ''}
            onChange={(e) => setTweaks(e.target.value)}
            onBlur={() => {
              const v = (tweaks ?? '').trim();
              if (tweaks !== null && v !== (job.tweaks ?? '')) updateJob(job.id, { tweaks: v });
            }}
            placeholder="e.g. Emphasize backend & system design, lead with my payments project, keep it to one page, play down frontend…"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">Applied on top of tailoring. It still won't fabricate or break your formatting.</p>
        </div>

        {!base && <p className="mt-2 text-sm text-amber-300">Set a base resume on the Resume page first.</p>}
        {msg && <p className="mt-3 rounded-md bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-muted)]">{msg}</p>}

        {variant?.format === 'latex' && <LatexResult variant={variant} onOverleaf={openInOverleaf} onDownload={(tex) => downloadText(`resume-${job.id}.tex`, tex)} onWasm={tryWasm} wasmBusy={wasmBusy} />}
        {variant?.format === 'checklist' && <ChecklistResult variant={variant} />}
      </div>

      {pdfPreviewUrl && (
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--text)]">In-browser PDF preview <span className="text-xs font-normal text-[var(--text-muted)]">(beta)</span></h2>
            <div className="flex flex-wrap gap-2">
              <a href={pdfPreviewUrl} download={`resume-${job.id}.pdf`} className={btnGhost}>Download PDF</a>
              <a href={pdfPreviewUrl} target="_blank" rel="noreferrer" className={btnGhost}>Open in new tab</a>
              <button className={btnGhost} onClick={() => setPdfPreviewUrl(null)}>Close</button>
            </div>
          </div>
          <iframe
            title="Tailored resume preview"
            src={pdfPreviewUrl}
            className="mt-3 h-[70vh] w-full rounded-md border border-[var(--border)] bg-white sm:h-[80vh]"
          />
        </div>
      )}

      <div className={card}>
        <h2 className="text-lg font-semibold text-[var(--text)]">Job description</h2>
        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-[var(--text-muted)]">
          {job.jdText || 'No description.'}
        </pre>
      </div>
    </div>
  );

  function LatexResult({
    variant, onOverleaf, onDownload, onWasm, wasmBusy,
  }: {
    variant: LatexVariant;
    onOverleaf: (tex: string) => void;
    onDownload: (tex: string) => void;
    onWasm: (tex: string) => void;
    wasmBusy: boolean;
  }) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-4">
        <p className="text-sm font-medium text-emerald-300">Tailored resume ready — formatting preserved, only keywords/wording changed.</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ScoreBadge label="ATS before" value={variant.atsBefore} />
          <span className="text-[var(--text-muted)]">→</span>
          <ScoreBadge label="ATS after" value={variant.atsAfter} highlight />
          {variant.atsAfter > variant.atsBefore && (
            <span className="rounded-full bg-emerald-900/50 px-2 py-1 text-xs font-medium text-emerald-200">
              +{variant.atsAfter - variant.atsBefore} match
            </span>
          )}
        </div>

        {variant.summary.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-[var(--text)]">What changed</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--text-muted)]">
              {variant.summary.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {variant.addedKeywords.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-[var(--text)]">JD keywords emphasized</h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {variant.addedKeywords.map((k) => (
                <span key={k} className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-200">{k}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button className={btn} onClick={() => onOverleaf(variant.latexSource)}>Open in Overleaf</button>
          <button className={btnGhost} onClick={() => onDownload(variant.latexSource)}>Download .tex</button>
          <button className={btnGhost} disabled={wasmBusy} onClick={() => onWasm(variant.latexSource)}>
            {wasmBusy ? 'Compiling…' : 'Preview PDF in browser (beta)'}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">Tip: "Open in Overleaf" compiles it exactly like your original. In-browser PDF is experimental.</p>
      </div>
    );
  }

  function ScoreBadge({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    const color = value >= 80 ? 'text-green-400' : value >= 60 ? 'text-amber-400' : value >= 40 ? 'text-orange-400' : 'text-red-400';
    return (
      <div className={`rounded-lg border px-3 py-2 text-center ${highlight ? 'border-emerald-600/60 bg-emerald-900/30' : 'border-[var(--border)]'}`}>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      </div>
    );
  }

  function ChecklistResult({ variant }: { variant: ChecklistVariant }) {
    const c = variant.checklist;
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-3">
          <ScoreBadge label="ATS match" value={c.score} highlight />
          <p className="text-sm text-[var(--text-muted)]">Apply the checklist below in your editor to raise this.</p>
        </div>
        <Section title="Add these keywords (if true for you)" items={c.missingKeywords} tone="amber" />
        {c.suggestions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[var(--text)]">Suggested edits</h3>
            <ul className="mt-1 space-y-1 text-sm text-[var(--text-muted)]">
              {c.suggestions.map((s, i) => (
                <li key={i}><span className="text-[var(--text)]">{s.where}:</span> {s.change}</li>
              ))}
            </ul>
          </div>
        )}
        <Section title="Already covered" items={c.presentKeywords} tone="green" />
        <Section title="Do NOT claim (no evidence in your resume)" items={c.doNotAdd} tone="red" />
      </div>
    );
  }

  function Section({ title, items, tone }: { title: string; items: string[]; tone: 'amber' | 'green' | 'red' }) {
    if (!items.length) return null;
    const toneCls = tone === 'amber' ? 'bg-amber-900/40 text-amber-200' : tone === 'green' ? 'bg-emerald-900/40 text-emerald-200' : 'bg-red-900/40 text-red-200';
    return (
      <div>
        <h3 className="text-sm font-medium text-[var(--text)]">{title}</h3>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {items.map((k) => <span key={k} className={`rounded-full px-2 py-0.5 text-xs ${toneCls}`}>{k}</span>)}
        </div>
      </div>
    );
  }
}
