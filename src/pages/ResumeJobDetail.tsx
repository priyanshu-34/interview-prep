import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useResume } from '../hooks/useResume';
import { tailorLatex, pdfChecklist, isResumeAIEnabled } from '../lib/resumeAI';
import { openInOverleaf, downloadText } from '../lib/overleaf';
import { compileLatexToPdf } from '../lib/latexWasm';
import type { JobStatus, LatexVariant, ChecklistVariant } from '../types/resume';
import { JOB_STATUSES } from '../types/resume';

const card = 'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6';
const btn = 'rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50';
const btnGhost = 'rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50';

export function ResumeJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { base, getJob, loading, setJobStatus, setJobNotes, setJobVariant, deleteJob } = useResume();

  const [working, setWorking] = useState(false);
  const [wasmBusy, setWasmBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Revoke the blob URL when it changes or the page unmounts.
  useEffect(() => () => { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); }, [pdfPreviewUrl]);

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
        const r = await tailorLatex(base.latexSource, { title: job!.title, company: job!.company, jdText: job!.jdText });
        await setJobVariant(job!.id, { format: 'latex', latexSource: r.latexSource, addedKeywords: r.addedKeywords });
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
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)]"
          >
            {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => { deleteJob(job.id); navigate('/resume'); }} className="ml-auto text-sm text-red-400 hover:underline">
            Delete job
          </button>
        </div>
        <div className="mt-3">
          <label className="text-sm text-[var(--text-muted)]">Notes</label>
          <textarea
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            rows={2}
            value={notesDraft ?? job.notes}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => { if (notesDraft !== null && notesDraft !== job.notes) setJobNotes(job.id, notesDraft); }}
            placeholder="Recruiter name, referral, follow-up date…"
          />
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text)]">Tailor for this job</h2>
          <button className={btn} disabled={working} onClick={tailor}>
            {working ? 'Tailoring…' : variant ? 'Re-tailor' : 'Tailor resume'}
          </button>
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
            <div className="flex gap-2">
              <a href={pdfPreviewUrl} download={`resume-${job.id}.pdf`} className={btnGhost}>Download PDF</a>
              <a href={pdfPreviewUrl} target="_blank" rel="noreferrer" className={btnGhost}>Open in new tab</a>
              <button className={btnGhost} onClick={() => setPdfPreviewUrl(null)}>Close</button>
            </div>
          </div>
          <iframe
            title="Tailored resume preview"
            src={pdfPreviewUrl}
            className="mt-3 w-full rounded-md border border-[var(--border)] bg-white"
            style={{ height: '80vh' }}
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
        {variant.addedKeywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {variant.addedKeywords.map((k) => (
              <span key={k} className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-200">{k}</span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
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

  function ChecklistResult({ variant }: { variant: ChecklistVariant }) {
    const c = variant.checklist;
    return (
      <div className="mt-4 space-y-4">
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
