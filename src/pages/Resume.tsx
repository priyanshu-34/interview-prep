import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useResume } from '../hooks/useResume';
import { jdFromText, jdFromImage, isResumeAIEnabled } from '../lib/resumeAI';
import { extractPdfText } from '../lib/pdfText';
import type { BaseResume, JobStatus } from '../types/resume';
import { JOB_STATUSES } from '../types/resume';

const card = 'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6';
const input = 'w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]';
const btn = 'rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50';

function readText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsText(file);
  });
}
function readDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

const statusColor: Record<JobStatus, string> = {
  saved: 'text-[var(--text-muted)]',
  tailored: 'text-blue-400',
  applied: 'text-indigo-400',
  interviewing: 'text-amber-400',
  offer: 'text-green-400',
  rejected: 'text-red-400',
};

export function Resume() {
  const { base, jobs, loading, signedIn, saveBase, addJob, setJobStatus, deleteJob } = useResume();
  const aiOn = isResumeAIEnabled();

  if (!signedIn) {
    return <div className={card}>Sign in (top-right) to use the resume tools — your data is saved to your account.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Resume</h1>
        <p className="text-sm text-[var(--text-muted)]">
          One base resume, tailored per job description (keywords only — never fakes anything), plus a tracker.
        </p>
        {!aiOn && (
          <p className="mt-2 rounded-md bg-amber-900/40 px-3 py-2 text-sm text-amber-200">
            Add <code>VITE_OPENAI_API_KEY</code> to <code>.env</code> to enable JD reading and tailoring.
          </p>
        )}
      </div>

      <BaseResumeCard base={base} onSave={saveBase} />
      <AddJobCard aiOn={aiOn} onAdd={addJob} />

      <div className={card}>
        <h2 className="text-lg font-semibold text-[var(--text)]">Jobs &amp; tracker</h2>
        {loading ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">No jobs yet. Add a JD above.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Resume</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-3 text-[var(--text)]">
                      <Link to={`/resume/job/${j.id}`} className="text-[var(--accent)] no-underline hover:underline">
                        {j.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-[var(--text-muted)]">{j.company || '—'}</td>
                    <td className="py-2 pr-3 text-[var(--text-muted)]">
                      {j.variant ? (j.variant.format === 'latex' ? 'Tailored .tex' : 'Checklist') : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={j.status}
                        onChange={(e) => setJobStatus(j.id, e.target.value as JobStatus)}
                        className={`bg-transparent text-sm ${statusColor[j.status]}`}
                      >
                        {JOB_STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-[var(--bg)] text-[var(--text)]">
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <button onClick={() => deleteJob(j.id)} className="text-xs text-red-400 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BaseResumeCard({ base, onSave }: { base: BaseResume | null; onSave: (b: BaseResume) => Promise<void> }) {
  const [tab, setTab] = useState<'latex' | 'file'>('latex');
  const [label, setLabel] = useState('');
  const [latex, setLatex] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveLatex() {
    if (!/\\documentclass/.test(latex)) { setMsg('Paste valid LaTeX (must contain \\documentclass).'); return; }
    setBusy(true); setMsg(null);
    try {
      await onSave({ label: label || 'My Resume', format: 'latex', latexSource: latex, rawText: latex, updatedAt: new Date().toISOString() });
      setMsg('Saved.'); setLatex('');
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  async function onFile(file: File) {
    setBusy(true); setMsg(null);
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.tex')) {
        const src = await readText(file);
        await onSave({ label: label || file.name.replace(/\.[^.]+$/, ''), format: 'latex', latexSource: src, rawText: src, updatedAt: new Date().toISOString() });
      } else if (name.endsWith('.pdf')) {
        const text = await extractPdfText(file);
        await onSave({ label: label || file.name.replace(/\.[^.]+$/, ''), format: 'pdf', rawText: text, updatedAt: new Date().toISOString() });
      } else { setMsg('Upload a .tex or .pdf file.'); return; }
      setMsg('Saved.');
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[var(--text)]">Base resume</h2>
        {base && (
          <span className="text-sm text-[var(--text-muted)]">
            Current: <strong className="text-[var(--text)]">{base.label}</strong>{' '}
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${base.format === 'latex' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-[var(--bg)] text-[var(--text-muted)]'}`}>
              {base.format === 'latex' ? 'LaTeX' : 'PDF'}
            </span>
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        LaTeX base → tailoring edits keywords and keeps your exact formatting. PDF base → tailoring gives a keyword checklist you apply yourself.
      </p>

      <div className="mt-3 inline-flex rounded-md border border-[var(--border)] p-0.5 text-sm">
        {(['latex', 'file'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1.5 ${tab === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'}`}>
            {t === 'latex' ? 'Paste LaTeX' : 'Upload .tex / .pdf'}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <input className={input} placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        {tab === 'latex' ? (
          <>
            <textarea className={`${input} font-mono`} rows={8} placeholder="\\documentclass{article}…\\begin{document}…\\end{document}" value={latex} onChange={(e) => setLatex(e.target.value)} />
            <button className={btn} disabled={busy} onClick={saveLatex}>{busy ? 'Saving…' : 'Save LaTeX resume'}</button>
          </>
        ) : (
          <input type="file" accept=".tex,.pdf" disabled={busy} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="text-sm text-[var(--text)]" />
        )}
        {msg && <p className="text-sm text-[var(--text-muted)]">{msg}</p>}
      </div>
    </div>
  );
}

function AddJobCard({
  aiOn,
  onAdd,
}: {
  aiOn: boolean;
  onAdd: (j: { title: string; company: string; location: string; jdText: string; source: 'text' | 'image' }) => Promise<unknown>;
}) {
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function addText() {
    if (!text.trim()) { setMsg('Paste the JD first.'); return; }
    setBusy(true); setMsg(null);
    try {
      const jd = await jdFromText(text);
      await onAdd({ title: jd.title, company: jd.company, location: jd.location, jdText: jd.jdText, source: 'text' });
      setText(''); setMsg('Job added.');
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  async function addImage(file: File) {
    setBusy(true); setMsg(null);
    try {
      const dataUrl = await readDataUrl(file);
      const jd = await jdFromImage(dataUrl);
      await onAdd({ title: jd.title, company: jd.company, location: jd.location, jdText: jd.jdText, source: 'image' });
      setMsg('Job added from screenshot.');
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold text-[var(--text)]">Add a job (from a JD)</h2>
      <div className="mt-3 inline-flex rounded-md border border-[var(--border)] p-0.5 text-sm">
        {(['text', 'image'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1.5 ${tab === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'}`}>
            {t === 'text' ? 'Paste JD text' : 'Upload JD screenshot'}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {tab === 'text' ? (
          <>
            <textarea className={input} rows={6} placeholder="Paste the job description…" value={text} onChange={(e) => setText(e.target.value)} />
            <button className={btn} disabled={busy} onClick={addText}>{busy ? 'Reading…' : 'Add job'}</button>
          </>
        ) : (
          <>
            {!aiOn && <p className="text-sm text-amber-300">Image reading needs VITE_OPENAI_API_KEY.</p>}
            <input type="file" accept="image/*" disabled={busy || !aiOn} onChange={(e) => e.target.files?.[0] && addImage(e.target.files[0])} className="text-sm text-[var(--text)]" />
          </>
        )}
        {msg && <p className="text-sm text-[var(--text-muted)]">{msg}</p>}
      </div>
    </div>
  );
}
