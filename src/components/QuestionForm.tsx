import { useState, useMemo, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, questionDocId } from '../lib/firebase';
import { tracks } from '../data';
import { useTopics } from '../contexts/TopicsContext';
import { isOpenAIEnabled, generateQuestionData, DEFAULT_SYSTEM_PROMPT_DSA, DEFAULT_SYSTEM_PROMPT_SYSTEM_DESIGN } from '../lib/openai';
import type { Question } from '../types';

const CONFIG_PROMPTS_REF = 'prompts';

function slug(str: string): string {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

export interface QuestionFormProps {
  question: Question | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

export function QuestionForm({ question, onClose, onSaved, onError }: QuestionFormProps) {
  const isEdit = !!question;
  const { getTopicsByTrack, getTopicById } = useTopics();
  const [systemPrompts, setSystemPrompts] = useState<{ dsa: string; systemDesign: string }>({
    dsa: DEFAULT_SYSTEM_PROMPT_DSA,
    systemDesign: DEFAULT_SYSTEM_PROMPT_SYSTEM_DESIGN,
  });
  const [trackId, setTrackId] = useState(question?.trackId ?? tracks[0]?.id ?? 'dsa');
  const [topicId, setTopicId] = useState(question?.topicId ?? '');
  const [title, setTitle] = useState(question?.title ?? '');
  const [difficulty, setDifficulty] = useState<string>(question?.difficulty ?? '');
  const [description, setDescription] = useState(question?.description ?? '');
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [gfgLink, setGfgLink] = useState(question?.gfgLink ?? '');
  const [leetcodeLink, setLeetcodeLink] = useState(question?.leetcodeLink ?? '');
  const [youtubeLink, setYoutubeLink] = useState(question?.youtubeLink ?? '');
  const [links, setLinks] = useState<{ label: string; url: string }[]>(
    question?.links?.length ? [...question.links] : [{ label: '', url: '' }]
  );
  const [order, setOrder] = useState(question?.order ?? 0);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [customUserPrompt, setCustomUserPrompt] = useState('');
  const isSystemDesign = trackId === 'system-design';

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', CONFIG_PROMPTS_REF));
        if (snap.exists() && snap.data()) {
          const d = snap.data();
          setSystemPrompts({
            dsa: typeof d.dsa === 'string' ? d.dsa : DEFAULT_SYSTEM_PROMPT_DSA,
            systemDesign: typeof d.systemDesign === 'string' ? d.systemDesign : DEFAULT_SYSTEM_PROMPT_SYSTEM_DESIGN,
          });
        }
      } catch {
        // keep defaults
      }
    };
    load();
  }, []);

  const topicsForTrack = useMemo(() => getTopicsByTrack(trackId), [getTopicsByTrack, trackId]);

  const handleGenerateWithAI = async () => {
    const topic = topicId ? getTopicById(topicId) : topicsForTrack[0];
    const topicName = topic?.name ?? (title.trim() || 'DSA');
    setGenerateError(null);
    setGenerating(true);
    try {
      const data = await generateQuestionData(topicName, {
        hint: title.trim() || undefined,
        trackId,
        userMessageOverride: customUserPrompt.trim() || undefined,
        systemPrompt: trackId === 'system-design' ? systemPrompts.systemDesign : systemPrompts.dsa,
        existingQuestion: isEdit
          ? {
              title,
              description: description || undefined,
              explanation: explanation || undefined,
              difficulty: difficulty || undefined,
              leetcodeLink: leetcodeLink || undefined,
              gfgLink: gfgLink || undefined,
              youtubeLink: youtubeLink || undefined,
              links: links.filter((l) => l.url?.trim()).length ? links : undefined,
            }
          : undefined,
      });
      setTitle(data.title);
      setDescription(data.description);
      setExplanation(data.explanation);
      setDifficulty(data.difficulty);
      setGfgLink(data.gfgLink);
      setLeetcodeLink(data.leetcodeLink);
      setYoutubeLink(data.youtubeLink);
      setLinks(
        data.links && data.links.length > 0
          ? data.links.map((l) => ({ label: l.label, url: l.url }))
          : [{ label: '', url: '' }]
      );
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!isEdit && topicsForTrack.length > 0 && !topicsForTrack.some((t) => t.id === topicId)) {
      setTopicId(topicsForTrack[0].id);
    }
  }, [isEdit, trackId, topicsForTrack, topicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onError('');
    try {
      const resolvedTopicId = topicId || topicsForTrack[0]?.id;
      if (!resolvedTopicId) {
        onError('Select a topic');
        setSaving(false);
        return;
      }
      const id = isEdit
        ? question!.id
        : (trackId === 'system-design'
          ? `${resolvedTopicId}_${Date.now()}_${slug(title)}`
          : `dsa_${resolvedTopicId}_${Date.now()}_${slug(title)}`);
      const ref = doc(db, 'questions', questionDocId(id));
      const linksFiltered = links.filter((l) => l.url.trim() !== '');
      const payload: Record<string, unknown> = {
        id,
        trackId,
        topicId: resolvedTopicId,
        title,
        difficulty: difficulty || null,
        gfgLink: gfgLink.trim(),
        leetcodeLink: leetcodeLink.trim(),
        youtubeLink: youtubeLink.trim(),
        order: Number(order) || 0,
      };
      if (description.trim()) payload.description = description.trim();
      if (explanation.trim()) payload.explanation = explanation.trim();
      if (linksFiltered.length > 0) payload.links = linksFiltered.map((l) => ({ label: l.label.trim() || 'Resource', url: l.url.trim() }));
      await setDoc(ref, isEdit ? payload : { ...payload, public: true }, { merge: true });
      onSaved();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{isEdit ? 'Edit question' : 'Add question'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Track</label>
            <select
              value={trackId}
              onChange={(e) => { setTrackId(e.target.value); setTopicId(''); }}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
              required
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Topic</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
              required
            >
              <option value="">Select topic</option>
              {topicsForTrack.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {isOpenAIEnabled() && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">
                  Custom user prompt (optional)
                </label>
                <textarea
                  value={customUserPrompt}
                  onChange={(e) => setCustomUserPrompt(e.target.value)}
                  placeholder="Leave empty to use default (topic + title hint). Or type your own prompt to send to the model instead."
                  rows={2}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] resize-y"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={generating || !topicId}
                className="w-full px-3 py-2 rounded border border-emerald-600/50 bg-emerald-600/20 text-emerald-400 text-sm hover:bg-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating with OpenAI…' : 'Generate with AI (from topic)'}
              </button>
              {generateError && (
                <p className="mt-1 text-xs text-red-400">{generateError}</p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
            >
              <option value="">Not set</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Order</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value) || 0)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Description (problem/study text)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional: problem statement or study description"
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)] resize-y"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Explanation</label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              placeholder="Optional: solution overview or explanation"
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)] resize-y"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm text-[var(--text-muted)]">Resources (links array)</label>
              <button
                type="button"
                onClick={() => setLinks((prev) => [...prev, { label: '', url: '' }])}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                + Add link
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              {isSystemDesign ? 'For system design, these are shown as Article/Video links. Leave URL empty to skip.' : 'Optional: list of resources (label + URL).'}
            </p>
            <div className="space-y-2">
              {links.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = { ...next[i], label: e.target.value };
                      setLinks(next);
                    }}
                    placeholder="Label (e.g. Article, Video)"
                    className="flex-1 min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                  />
                  <input
                    type="url"
                    value={item.url}
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = { ...next[i], url: e.target.value };
                      setLinks(next);
                    }}
                    placeholder="URL"
                    className="flex-[2] min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                  />
                  <button
                    type="button"
                    onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                    className="p-2 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] shrink-0"
                    aria-label="Remove link"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">LeetCode link</label>
            <input
              type="url"
              value={leetcodeLink}
              onChange={(e) => setLeetcodeLink(e.target.value)}
              placeholder="https://leetcode.com/problems/..."
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">GFG link</label>
            <input
              type="url"
              value={gfgLink}
              onChange={(e) => setGfgLink(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">YouTube link</label>
            <input
              type="url"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
