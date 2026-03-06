import { useState, useMemo, useEffect } from 'react';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, questionDocId } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useQuestions } from '../contexts/QuestionsContext';
import { tracks, getTopicsByTrack, getTopicById } from '../data';
import { isAdmin } from '../lib/admin';
import type { Question } from '../types';
import questionsJson from '../data/questions.json';

const BATCH_SIZE = 500;

function slug(str: string): string {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

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

  const topics = useMemo(() => (filterTrack ? getTopicsByTrack(filterTrack) : []), [filterTrack]);

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
          batch.set(ref, {
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
          });
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

interface QuestionFormProps {
  question: Question | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

function QuestionForm({ question, onClose, onSaved, onError }: QuestionFormProps) {
  const isEdit = !!question;
  const [trackId, setTrackId] = useState(question?.trackId ?? tracks[0]?.id ?? 'dsa');
  const [topicId, setTopicId] = useState(question?.topicId ?? '');
  const [title, setTitle] = useState(question?.title ?? '');
  const [difficulty, setDifficulty] = useState<string>(question?.difficulty ?? '');
  const [gfgLink, setGfgLink] = useState(question?.gfgLink ?? '');
  const [leetcodeLink, setLeetcodeLink] = useState(question?.leetcodeLink ?? '');
  const [youtubeLink, setYoutubeLink] = useState(question?.youtubeLink ?? '');
  const [order, setOrder] = useState(question?.order ?? 0);
  const [saving, setSaving] = useState(false);

  const topicsForTrack = useMemo(() => getTopicsByTrack(trackId), [trackId]);

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
      const id = isEdit ? question!.id : `dsa_${resolvedTopicId}_${Date.now()}_${slug(title)}`;
      const ref = doc(db, 'questions', questionDocId(id));
      const payload = {
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
