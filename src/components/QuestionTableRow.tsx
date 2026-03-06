import type { Question } from '../types';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LeetCodeIcon, GFGIcon, YouTubeIcon, CheckCircleIcon, NotesIcon } from './Icons';
import { useBookmarks } from '../hooks/useBookmarks';
import { useActivity } from '../hooks/useActivity';
import { useNotes } from '../hooks/useNotes';
import { NoteEditor } from './NoteEditor';
import { useState, useEffect, useRef } from 'react';

interface QuestionTableRowProps {
  q: Question;
  showTopic?: boolean;
  topicName?: string;
  /** Number of columns (for note expand row colspan) */
  colSpan: number;
}

export function QuestionTableRow({ q, showTopic, topicName, colSpan }: QuestionTableRowProps) {
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isSolved, markDone, unmarkDone } = useActivity();
  const { getNote, setNote, loadNote } = useNotes();
  const [showNote, setShowNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const bookmarked = isBookmarked(q.id);
  const solved = isSolved(q.id);
  const note = getNote(q.id);
  const canSaveProgress = !!user;

  useEffect(() => {
    if (!showNote) return;
    const existing = getNote(q.id);
    if (existing != null) {
      setNoteContent(existing.content ?? '');
      return;
    }
    let cancelled = false;
    loadNote(q.id).then((loaded) => {
      if (!cancelled && loaded != null) setNoteContent(loaded.content ?? '');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync on open; omit getNote to avoid overwriting while typing
  }, [showNote, q.id]);

  const saveNote = async (valueFromBlur?: string, closeAfterSave = false) => {
    const textToSave = typeof valueFromBlur === 'string' ? valueFromBlur : noteContent;
    if (typeof textToSave !== 'string') return;
    setSaveStatus('saving');
    setSaveError(null);
    setNoteContent(textToSave);
    try {
      await setNote(q.id, textToSave);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
      if (closeAfterSave) setShowNote(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaveStatus('error');
    }
  };

  const difficultyBadge =
    q.difficulty === 'easy'
      ? 'bg-green-900/30 text-green-400'
      : q.difficulty === 'medium'
        ? 'bg-amber-900/30 text-amber-400'
        : q.difficulty === 'hard'
          ? 'bg-red-900/30 text-red-400'
          : 'bg-[var(--border)]/50 text-[var(--text-muted)]';

  return (
    <>
      <tr className="border-b border-[var(--border)] hover:bg-[var(--bg-card)]">
        <td className="p-3 text-[var(--text)] font-medium">
          <Link to={`/question/${encodeURIComponent(q.id)}`} className="hover:text-[var(--accent)] hover:underline">
            {q.title}
          </Link>
        </td>
        {showTopic && (
          <td className="p-3 text-[var(--text-muted)]">{topicName ?? q.topicId}</td>
        )}
        <td className="p-3">
          <span className={`px-2 py-0.5 rounded text-xs capitalize ${difficultyBadge}`}>
            {q.difficulty ?? '—'}
          </span>
        </td>
        <td className="p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {q.leetcodeLink && (
              <a
                href={q.leetcodeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                title="LeetCode"
                aria-label="Open on LeetCode"
              >
                <LeetCodeIcon className="w-4 h-4" />
              </a>
            )}
            {q.gfgLink && (
              <a
                href={q.gfgLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded bg-green-700/20 text-green-400 hover:bg-green-700/30"
                title="GeeksForGeeks"
                aria-label="Open on GFG"
              >
                <GFGIcon className="w-4 h-4" />
              </a>
            )}
            {q.youtubeLink && (
              <a
                href={q.youtubeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                title="YouTube"
                aria-label="Open on YouTube"
              >
                <YouTubeIcon className="w-4 h-4" />
              </a>
            )}
            {!q.leetcodeLink && !q.gfgLink && !q.youtubeLink && (
              <span className="text-[var(--text-muted)] text-xs">—</span>
            )}
          </div>
        </td>
        <td className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleBookmark(q.id)}
              className={`p-1.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${bookmarked ? 'text-amber-400' : 'text-[var(--text-muted)]'} hover:bg-[var(--border)]`}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {bookmarked ? '★' : '☆'}
            </button>
            <button
              type="button"
              onClick={() => canSaveProgress && (solved ? unmarkDone(q.id) : markDone(q.id))}
              disabled={!canSaveProgress}
              className={`p-1.5 rounded flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${solved ? 'text-[var(--success)]' : 'text-[var(--text-muted)] hover:bg-[var(--border)]'}`}
              title={canSaveProgress ? (solved ? 'Undo' : 'Mark done') : 'Sign in to save'}
              aria-label={canSaveProgress ? (solved ? 'Undo mark done' : 'Mark done') : 'Sign in to save'}
            >
              <CheckCircleIcon className="w-4 h-4" filled={solved} />
            </button>
            <button
              type="button"
              onClick={() => setShowNote(!showNote)}
              className={`p-1.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${note ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} hover:bg-[var(--border)]`}
              title="Notes"
              aria-label="Notes"
            >
              <NotesIcon className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {showNote && (
        <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
          <td colSpan={colSpan} className="p-3 align-top">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                Your note (Markdown supported; click Save to save)
              </label>
              <NoteEditor
                value={noteContent}
                onChange={setNoteContent}
                placeholder="Add notes, approach, dry run..."
                minHeight="140px"
                textareaRef={noteTextareaRef}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveNote(undefined, true)}
                  disabled={saveStatus === 'saving'}
                  className="text-sm text-[var(--accent)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-60"
                >
                  {saveStatus === 'saving' ? 'Saving…' : 'Save note'}
                </button>
                {saveStatus === 'saved' && (
                  <span className="text-sm text-[var(--success)]">Note saved.</span>
                )}
                {saveStatus === 'error' && saveError && (
                  <span className="text-sm text-red-400" title={saveError}>
                    Failed to save: {saveError}
                  </span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
