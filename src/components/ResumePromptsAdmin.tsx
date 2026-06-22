import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin } from '../lib/admin';
import {
  loadResumePrompts,
  saveResumePrompts,
  getDefaultResumePrompts,
  type ResumePrompts,
  type CustomPrompt,
} from '../lib/resumeAI';

const card = 'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6';
const input = 'w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base sm:text-sm text-[var(--text)]';
const btn = 'rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 min-h-[44px]';
const btnGhost = 'rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg)] min-h-[40px]';

type BaseKey = 'tailor' | 'jd' | 'checklist' | 'analyze';
const BASE_FIELDS: { key: BaseKey; label: string; help: string }[] = [
  { key: 'tailor', label: 'Tailor (LaTeX)', help: 'System prompt used to rewrite the LaTeX resume for a JD.' },
  { key: 'jd', label: 'JD extraction', help: 'Turns pasted text / screenshots into structured JD fields.' },
  { key: 'checklist', label: 'PDF checklist', help: 'Builds the keyword/edit checklist + ATS score for PDF resumes.' },
  { key: 'analyze', label: 'ATS analysis', help: 'Scores before/after and summarizes what changed.' },
];

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function ResumePromptsAdmin() {
  const { user } = useAuth();
  const admin = isAdmin(user?.email ?? undefined);

  const [open, setOpen] = useState(false);
  const [p, setP] = useState<ResumePrompts | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (admin && open && !p) loadResumePrompts(true).then(setP).catch(() => setP(getDefaultResumePrompts()));
  }, [admin, open, p]);

  if (!admin) return null;

  function setBase(key: BaseKey, val: string) {
    setP((cur) => (cur ? { ...cur, [key]: val } : cur));
  }
  function resetBase(key: BaseKey) {
    setP((cur) => (cur ? { ...cur, [key]: getDefaultResumePrompts()[key] } : cur));
  }
  function addCustom() {
    setP((cur) => (cur ? { ...cur, custom: [...cur.custom, { id: genId(), name: 'New prompt', prompt: '' }] } : cur));
  }
  function setCustom(id: string, patch: Partial<CustomPrompt>) {
    setP((cur) => (cur ? { ...cur, custom: cur.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : cur));
  }
  function delCustom(id: string) {
    setP((cur) => (cur ? { ...cur, custom: cur.custom.filter((c) => c.id !== id) } : cur));
  }

  async function save() {
    if (!p) return;
    setSaving(true);
    setMsg(null);
    try {
      const clean: ResumePrompts = {
        ...p,
        custom: p.custom.filter((c) => c.name.trim() && c.prompt.trim()).map((c) => ({ ...c, name: c.name.trim() })),
      };
      await saveResumePrompts(clean);
      setP(clean);
      setMsg('Saved. New prompts apply to the next tailor/JD action.');
    } catch (e) {
      setMsg((e as Error).message || 'Save failed (admin only).');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={card}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="text-lg font-semibold text-[var(--text)]">AI prompts <span className="text-xs font-normal text-[var(--text-muted)]">(admin)</span></span>
        <span className="text-[var(--text-muted)]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          {!p ? (
            <p className="text-sm text-[var(--text-muted)]">Loading prompts…</p>
          ) : (
            <>
              {BASE_FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--text)]">{f.label}</label>
                    <button className={btnGhost} onClick={() => resetBase(f.key)}>Reset to default</button>
                  </div>
                  <p className="mb-1 text-xs text-[var(--text-muted)]">{f.help}</p>
                  <textarea className={`${input} font-mono`} rows={5} value={p[f.key]} onChange={(e) => setBase(f.key, e.target.value)} />
                </div>
              ))}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--text)]">Custom tailor prompts</h3>
                  <button className={btnGhost} onClick={addCustom}>+ Add</button>
                </div>
                <p className="mb-2 text-xs text-[var(--text-muted)]">
                  Named alternatives to the default Tailor prompt — selectable per job on the tailor screen.
                </p>
                {p.custom.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No custom prompts yet.</p>
                ) : (
                  <div className="space-y-3">
                    {p.custom.map((c) => (
                      <div key={c.id} className="rounded-md border border-[var(--border)] p-3">
                        <div className="flex items-center gap-2">
                          <input className={input} placeholder="Name (e.g. Aggressive, FAANG)" value={c.name} onChange={(e) => setCustom(c.id, { name: e.target.value })} />
                          <button className="text-xs text-red-400 hover:underline" onClick={() => delCustom(c.id)}>Delete</button>
                        </div>
                        <textarea className={`${input} mt-2 font-mono`} rows={4} placeholder="System prompt…" value={c.prompt} onChange={(e) => setCustom(c.id, { prompt: e.target.value })} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button className={btn} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save prompts'}</button>
                {msg && <span className="text-sm text-[var(--text-muted)]">{msg}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
