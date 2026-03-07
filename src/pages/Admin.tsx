import { useState, useMemo, useEffect } from 'react';
import { doc, setDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db, questionDocId } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useQuestions } from '../contexts/QuestionsContext';
import { tracks } from '../data';
import { useTopics } from '../contexts/TopicsContext';
import { isAdmin } from '../lib/admin';
import {
  isOpenAIEnabled,
  DEFAULT_SYSTEM_PROMPT_DSA,
  DEFAULT_SYSTEM_PROMPT_SYSTEM_DESIGN,
  DEFAULT_BULK_SYSTEM_PROMPT,
  generateBulkSystemDesign,
  type BulkSystemDesignPayload,
} from '../lib/openai';
import type { Question } from '../types';
import questionsJson from '../data/questions.json';
import { QuestionForm } from '../components/QuestionForm';

const CONFIG_PROMPTS_REF = 'prompts';

const BATCH_SIZE = 500;

export function Admin() {
  const { user } = useAuth();
  const { questions, refetch } = useQuestions();
  const [search, setSearch] = useState('');
  const [filterTrack, setFilterTrack] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [editing, setEditing] = useState<Question | null>(null);
  const [adding, setAdding] = useState(false);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'unpublished'>('all');
  const [systemPrompts, setSystemPrompts] = useState<{ dsa: string; systemDesign: string; bulkSystemDesign: string }>({
    dsa: DEFAULT_SYSTEM_PROMPT_DSA,
    systemDesign: DEFAULT_SYSTEM_PROMPT_SYSTEM_DESIGN,
    bulkSystemDesign: DEFAULT_BULK_SYSTEM_PROMPT,
  });
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const { getTopicsByTrack, getTopicById, addCustomTopic, refetchCustomTopics } = useTopics();

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', CONFIG_PROMPTS_REF));
        if (snap.exists() && snap.data()) {
          const d = snap.data();
          setSystemPrompts({
            dsa: typeof d.dsa === 'string' ? d.dsa : DEFAULT_SYSTEM_PROMPT_DSA,
            systemDesign: typeof d.systemDesign === 'string' ? d.systemDesign : DEFAULT_SYSTEM_PROMPT_SYSTEM_DESIGN,
            bulkSystemDesign: typeof d.bulkSystemDesign === 'string' ? d.bulkSystemDesign : DEFAULT_BULK_SYSTEM_PROMPT,
          });
        }
      } catch {
        // keep defaults
      }
    };
    load();
  }, []);

  const topics = useMemo(() => (filterTrack ? getTopicsByTrack(filterTrack) : []), [filterTrack, getTopicsByTrack]);

  const filtered = useMemo(() => {
    let list = questions;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((q) => q.title.toLowerCase().includes(term));
    }
    if (filterTrack) list = list.filter((q) => q.trackId === filterTrack);
    if (filterTopic) list = list.filter((q) => q.topicId === filterTopic);
    if (filterDifficulty) list = list.filter((q) => (q.difficulty ?? '') === filterDifficulty);
    if (filterStatus === 'published') list = list.filter((q) => q.public !== false);
    if (filterStatus === 'unpublished') list = list.filter((q) => q.public === false);
    return list.sort((a, b) => a.order - b.order);
  }, [questions, search, filterTrack, filterTopic, filterDifficulty, filterStatus]);

  const handleImport = async () => {
    setSaveError(null);
    setImporting(true);
    try {
      const list = questionsJson as Question[];
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = list.slice(i, i + BATCH_SIZE);
        for (const q of chunk) {
          const ref = doc(db, 'questions', questionDocId(q.id));
          const data: Record<string, unknown> = {
            id: q.id,
            trackId: q.trackId,
            topicId: q.topicId,
            title: q.title,
            difficulty: q.difficulty,
            gfgLink: q.gfgLink ?? '',
            leetcodeLink: q.leetcodeLink ?? '',
            youtubeLink: q.youtubeLink ?? '',
            order: q.order,
            public: true,
          };
          if (q.description != null) data.description = q.description;
          if (q.explanation != null) data.explanation = q.explanation;
          if (Array.isArray(q.links) && q.links.length > 0) data.links = q.links;
          batch.set(ref, data);
        }
        await batch.commit();
      }
      await refetch();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (!user || !isAdmin(user.email ?? undefined)) {
    return null;
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">Admin – Questions</h1>
      {saveError && (
        <p className="mb-4 p-3 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-sm">{saveError}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <input
          type="search"
          placeholder="Search by title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-48 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:py-1.5 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0"
        />
        <select
          value={filterTrack}
          onChange={(e) => {
            setFilterTrack(e.target.value);
            setFilterTopic('');
          }}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:py-1.5 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0"
        >
          <option value="">All tracks</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:py-1.5 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0"
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:py-1.5 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0"
        >
          <option value="">All difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'published' | 'unpublished')}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:py-1.5 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0"
        >
          <option value="all">All status</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
        </select>
        <button
          type="button"
          onClick={() => { setAdding(true); setEditing(null); setSaveError(null); }}
          className="px-3 py-1.5 rounded border border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)] text-sm hover:bg-[var(--accent)]/30"
        >
          Add question
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] text-sm hover:bg-[var(--border)] disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import from JSON'}
        </button>
        {isOpenAIEnabled() && (
          <button
            type="button"
            onClick={() => setShowPromptsModal(true)}
            className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] text-sm hover:bg-[var(--border)]"
          >
            Edit system prompts (AI)
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowAddTopicModal(true)}
          className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] text-sm hover:bg-[var(--border)]"
        >
          Add topic
        </button>
        {isOpenAIEnabled() && (
          <button
            type="button"
            onClick={() => setShowBulkCreateModal(true)}
            className="px-3 py-1.5 rounded border border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)] text-sm hover:bg-[var(--accent)]/30"
          >
            Bulk Create using AI
          </button>
        )}
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-4">{filtered.length} questions</p>
      <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
              <th className="text-left p-3 text-[var(--text-muted)]">Title</th>
              <th className="text-left p-3 text-[var(--text-muted)]">Topic</th>
              <th className="text-left p-3 text-[var(--text-muted)]">Difficulty</th>
              <th className="text-left p-3 text-[var(--text-muted)]">Order</th>
              <th className="text-left p-3 text-[var(--text-muted)]">Status</th>
              <th className="p-3 text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => {
              const topic = getTopicById(q.topicId);
              const isPublished = q.public !== false;
              return (
                <tr key={q.id} className={`border-b border-[var(--border)] hover:bg-[var(--bg-card)] ${!isPublished ? 'opacity-75' : ''}`}>
                  <td className="p-3 text-[var(--text)] font-medium">{q.title}</td>
                  <td className="p-3 text-[var(--text-muted)]">{topic?.name ?? q.topicId}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      q.difficulty === 'easy' ? 'bg-green-900/30 text-green-400' :
                      q.difficulty === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                      q.difficulty === 'hard' ? 'bg-red-900/30 text-red-400' : 'text-[var(--text-muted)]'
                    }`}>
                      {q.difficulty ?? '—'}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--text-muted)]">{q.order}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${isPublished ? 'bg-green-900/30 text-green-400' : 'bg-gray-600/30 text-gray-400'}`}>
                      {isPublished ? 'Published' : 'Unpublished'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditing(q); setAdding(false); setSaveError(null); }}
                      className="text-[var(--accent)] hover:underline py-1.5 px-1 min-h-[44px] sm:min-h-0 flex items-center"
                    >
                      Edit
                    </button>
                    {isPublished ? (
                      <button
                        type="button"
                        onClick={() => setUnpublishingId(q.id)}
                        className="text-amber-500 hover:underline py-1.5 px-1 min-h-[44px] sm:min-h-0 flex items-center"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setSaveError(null);
                          try {
                            await setDoc(doc(db, 'questions', questionDocId(q.id)), { public: true }, { merge: true });
                            await refetch();
                          } catch (err: unknown) {
                            setSaveError(err instanceof Error ? err.message : 'Publish failed');
                          }
                        }}
                        className="text-green-500 hover:underline py-1.5 px-1 min-h-[44px] sm:min-h-0 flex items-center"
                      >
                        Publish
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(adding || editing) && (
        <QuestionForm
          question={editing}
          onClose={() => { setAdding(false); setEditing(null); setSaveError(null); }}
          onSaved={async () => { await refetch(); setAdding(false); setEditing(null); setSaveError(null); }}
          onError={(msg) => setSaveError(msg)}
        />
      )}
      {showPromptsModal && (
        <SystemPromptsModal
          initialDsa={systemPrompts.dsa}
          initialSystemDesign={systemPrompts.systemDesign}
          initialBulkSystemDesign={systemPrompts.bulkSystemDesign}
          onClose={() => setShowPromptsModal(false)}
          onSaved={(dsa, systemDesign, bulkSystemDesign) => {
            setSystemPrompts({ dsa, systemDesign, bulkSystemDesign });
            setShowPromptsModal(false);
          }}
          onError={(msg) => setSaveError(msg)}
        />
      )}
      {showAddTopicModal && (
        <AddTopicModal
          onClose={() => setShowAddTopicModal(false)}
          onSaved={() => setShowAddTopicModal(false)}
          onError={(msg) => setSaveError(msg)}
          addCustomTopic={addCustomTopic}
        />
      )}
      {showBulkCreateModal && (
        <BulkCreateModal
          questions={questions}
          getTopicsByTrack={getTopicsByTrack}
          bulkSystemPrompt={systemPrompts.bulkSystemDesign || DEFAULT_BULK_SYSTEM_PROMPT}
          onClose={() => setShowBulkCreateModal(false)}
          onSaved={async () => {
            await refetch();
            await refetchCustomTopics();
            setShowBulkCreateModal(false);
          }}
          onError={(msg) => setSaveError(msg)}
        />
      )}
      {unpublishingId && (
        <ConfirmUnpublish
          questionId={unpublishingId}
          onClose={() => setUnpublishingId(null)}
          onDone={async () => { await refetch(); setUnpublishingId(null); }}
          onError={(msg) => { setSaveError(msg); setUnpublishingId(null); }}
        />
      )}
    </div>
  );
}

const CUSTOM_TOPICS_REF = 'customTopics';

function slug(str: string): string {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

interface BulkCreateModalProps {
  questions: Question[];
  getTopicsByTrack: (trackId: string) => { id: string; name: string }[];
  bulkSystemPrompt: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}

function BulkCreateModal({
  questions,
  getTopicsByTrack,
  bulkSystemPrompt,
  onClose,
  onSaved,
  onError,
}: BulkCreateModalProps) {
  const [jsonText, setJsonText] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLocalError(null);
    setGenerating(true);
    try {
      const sdTopics = getTopicsByTrack('system-design');
      const sdQuestions = questions.filter((q) => q.trackId === 'system-design');
      const existingTopicsWithQuestions = sdTopics.map((t) => ({
        topicName: t.name,
        questionTitles: sdQuestions.filter((q) => q.topicId === t.id).map((q) => q.title),
      }));
      const payload = await generateBulkSystemDesign(existingTopicsWithQuestions, {
        userPrompt: userPrompt.trim() || undefined,
        systemPrompt: bulkSystemPrompt?.trim() || undefined,
      });
      setJsonText(JSON.stringify(payload, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setLocalError(msg);
      onError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmAndAdd = async () => {
    if (!jsonText?.trim()) {
      onError('Generate content first or paste JSON');
      return;
    }
    setLocalError(null);
    setSaving(true);
    try {
      let payload: BulkSystemDesignPayload;
      try {
        payload = JSON.parse(jsonText) as BulkSystemDesignPayload;
      } catch {
        onError('Invalid JSON. Fix the syntax and try again.');
        setSaving(false);
        return;
      }
      if (!Array.isArray(payload.topics) || !Array.isArray(payload.questions)) {
        onError('JSON must have "topics" and "questions" arrays.');
        setSaving(false);
        return;
      }
      const existingSdTopics = getTopicsByTrack('system-design');
      const existingTopicNames = new Set(existingSdTopics.map((t) => t.name));
      const newTopicNames = new Set(payload.topics.map((t) => t.name.trim()).filter(Boolean));
      const validTopicNames = new Set([...existingTopicNames, ...newTopicNames]);
      for (const q of payload.questions) {
        if (!q.topicName?.trim() || !q.title?.trim()) continue;
        if (!validTopicNames.has(q.topicName.trim())) {
          onError(`Question "${q.title}" references unknown topic "${q.topicName}". Use an existing topic name or add it to "topics".`);
          setSaving(false);
          return;
        }
      }

      const batchId = Date.now();
      const nameToId = new Map<string, string>();
      existingSdTopics.forEach((t) => nameToId.set(t.name, t.id));

      const customSnap = await getDoc(doc(db, 'config', CUSTOM_TOPICS_REF));
      const existingCustomTopics: { id: string; trackId: string; name: string; order: number }[] = customSnap.exists() && Array.isArray(customSnap.data()?.topics)
        ? (customSnap.data().topics as { id: string; trackId: string; name: string; order: number }[])
        : [];
      const maxOrder = existingCustomTopics.length
        ? Math.max(...existingCustomTopics.map((t) => t.order), 0)
        : 0;
      const newTopics: { id: string; trackId: string; name: string; order: number }[] = payload.topics
        .filter((t) => t.name?.trim())
        .map((t, i) => ({
          id: `custom_sd_${batchId}_${i}_${slug(t.name)}`,
          trackId: 'system-design',
          name: t.name.trim(),
          order: maxOrder + 1 + i,
        }));
      if (newTopics.length > 0) {
        const updatedTopics = [...existingCustomTopics, ...newTopics];
        await setDoc(doc(db, 'config', CUSTOM_TOPICS_REF), { topics: updatedTopics });
      }
      newTopics.forEach((t) => nameToId.set(t.name, t.id));
      const toWrite = payload.questions.filter((q) => q.topicName?.trim() && q.title?.trim());
      for (let j = 0; j < toWrite.length; j++) {
        const q = toWrite[j];
        const topicId = nameToId.get(q.topicName!.trim());
        if (!topicId) continue;
        const questionId = `${topicId}_${batchId}_${j}_${slug(q.title)}`;
        const docData: Record<string, unknown> = {
          id: questionId,
          trackId: 'system-design',
          topicId,
          title: q.title.trim(),
          difficulty: q.difficulty === 'easy' || q.difficulty === 'medium' || q.difficulty === 'hard' ? q.difficulty : null,
          gfgLink: '',
          leetcodeLink: '',
          youtubeLink: '',
          order: typeof q.order === 'number' ? q.order : j,
          public: false,
        };
        if (q.description != null) docData.description = q.description;
        if (q.explanation != null) docData.explanation = q.explanation;
        if (Array.isArray(q.links) && q.links.length) docData.links = q.links;
        await setDoc(doc(db, 'questions', questionDocId(questionId)), docData);
      }

      await onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setLocalError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-lg font-semibold text-[var(--text)] p-4 border-b border-[var(--border)]">
          Bulk Create using AI (System Design)
        </h2>
        <p className="text-sm text-[var(--text-muted)] px-4 pb-2">
          AI can add new questions to existing topics and/or create new topics with questions. Optional user prompt guides the model (e.g. &quot;Focus on caching&quot;). Review and edit the JSON below, then click Confirm and add to save.
        </p>
        {localError && (
          <p className="mx-4 mb-2 p-2 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-sm">{localError}</p>
        )}
        <div className="flex-1 overflow-auto px-4 pb-4">
          {jsonText == null ? (
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">User prompt (optional)</label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Focus on distributed caching and add 3 questions per topic"
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] resize-y"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {generating ? 'Generating…' : 'Generate topics & questions'}
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={20}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] font-mono resize-y"
                placeholder='{ "topics": [...], "questions": [...] }'
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleConfirmAndAdd}
                  disabled={saving}
                  className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Confirm and add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setJsonText(null); }}
                  disabled={generating}
                  className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)] disabled:opacity-50"
                >
                  Generate again
                </button>
                <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)]">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface AddTopicModalProps {
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
  addCustomTopic: (topic: { trackId: string; name: string; order: number }) => Promise<void>;
}

function AddTopicModal({ onClose, onSaved, onError, addCustomTopic }: AddTopicModalProps) {
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? 'dsa');
  const [name, setName] = useState('');
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      onError('Enter a topic name');
      return;
    }
    setSaving(true);
    onError('');
    try {
      await addCustomTopic({ trackId, name: trimmed, order: Number(order) || 0 });
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add topic');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Add topic</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Track</label>
            <select
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1">Topic name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sliding Window"
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text)]"
            />
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
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface SystemPromptsModalProps {
  initialDsa: string;
  initialSystemDesign: string;
  initialBulkSystemDesign: string;
  onClose: () => void;
  onSaved: (dsa: string, systemDesign: string, bulkSystemDesign: string) => void;
  onError: (msg: string) => void;
}

function SystemPromptsModal({
  initialDsa,
  initialSystemDesign,
  initialBulkSystemDesign,
  onClose,
  onSaved,
  onError,
}: SystemPromptsModalProps) {
  const [dsa, setDsa] = useState(initialDsa);
  const [systemDesign, setSystemDesign] = useState(initialSystemDesign);
  const [bulkSystemDesign, setBulkSystemDesign] = useState(initialBulkSystemDesign);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    onError('');
    try {
      await setDoc(doc(db, 'config', CONFIG_PROMPTS_REF), { dsa, systemDesign, bulkSystemDesign });
      onSaved(dsa, systemDesign, bulkSystemDesign);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save prompts');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Edit system prompts (AI)</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          DSA and System Design prompts are used for &quot;Generate with AI&quot; on a single question. Bulk Create prompt is used for &quot;Bulk Create using AI&quot;.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">DSA system prompt</label>
            <textarea
              value={dsa}
              onChange={(e) => setDsa(e.target.value)}
              rows={8}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] font-mono resize-y"
              placeholder="System prompt for DSA..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">System Design system prompt</label>
            <textarea
              value={systemDesign}
              onChange={(e) => setSystemDesign(e.target.value)}
              rows={12}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] font-mono resize-y"
              placeholder="System prompt for System Design..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Bulk Create (System Design) system prompt</label>
            <textarea
              value={bulkSystemDesign}
              onChange={(e) => setBulkSystemDesign(e.target.value)}
              rows={12}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] font-mono resize-y"
              placeholder="System prompt for Bulk Create..."
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save prompts'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmUnpublishProps {
  questionId: string;
  onClose: () => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

function ConfirmUnpublish({ questionId, onClose, onDone, onError }: ConfirmUnpublishProps) {
  const [working, setWorking] = useState(false);
  const handleUnpublish = async () => {
    setWorking(true);
    try {
      await setDoc(doc(db, 'questions', questionDocId(questionId)), { public: false }, { merge: true });
      onDone();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Unpublish failed');
    } finally {
      setWorking(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 max-w-sm">
        <p className="text-[var(--text)] mb-4">Unpublish this question? It will be hidden from the app. You can publish it again from Admin anytime.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={working}
            className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {working ? 'Unpublishing…' : 'Unpublish'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text)]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
