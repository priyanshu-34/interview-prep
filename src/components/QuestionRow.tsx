import type { Question } from '../types';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LeetCodeIcon, GFGIcon, YouTubeIcon, CheckCircleIcon, NotesIcon } from './Icons';
import { useBookmarks } from '../hooks/useBookmarks';
import { useActivity } from '../hooks/useActivity';
import { usePrefs } from '../hooks/usePrefs';
import { useNotes } from '../hooks/useNotes';
import { NoteEditor } from './NoteEditor';
import { useState, useEffect, useRef } from 'react';

interface QuestionRowProps {
  q: Question;
  showTopic?: boolean;
  topicName?: string;
}

export function QuestionRow({ q, showTopic, topicName }: QuestionRowProps) {
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isSolved, markDone, unmarkDone } = useActivity();
  const { toggleMarkForRevision, isMarkedForRevision } = usePrefs();
  const { getNote, setNote, loadNote } = useNotes();
  const [showNote, setShowNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const bookmarked = isBookmarked(q.id);
  const solved = isSolved(q.id);
  const markedForRevision = isMarkedForRevision(q.id);
  const note = getNote(q.id);
  const canSaveProgress = !!user;

  // When opening the panel, show saved note: use in-memory getNote first, else fetch from Firestore.
  // Only run when showNote or q.id changes so we don't overwrite the user's typing when notes load.
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
    const textToSave =
      typeof valueFromBlur === 'string' ? valueFromBlur : noteContent;
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
      const message = err instanceof Error ? err.message : String(err);
      setSaveError(message);
      setSaveStatus('error');
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4">
      {/* Mobile: line 1 = title only, line 2 = links + options. Desktop (lg): single row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:gap-4">
        {/* Line 1 on mobile: question name only */}
        <div className="w-full lg:flex-1 lg:min-w-0 order-1 lg:order-none">
          <Link
            to={`/question/${encodeURIComponent(q.id)}`}
            className="font-medium text-[var(--text)] text-sm sm:text-base break-words hover:text-[var(--accent)] hover:underline"
          >
            {q.title}
          </Link>
        </div>
        {/* Line 2 on mobile: topic, difficulty, links, bookmark, mark done, notes */}
        <div className="flex items-center gap-2 flex-wrap mt-2 lg:mt-0 lg:shrink-0 order-2">
          {showTopic && topicName && (
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded shrink-0">
              {topicName}
            </span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded capitalize w-14 sm:w-16 text-center shrink-0 ${q.difficulty === 'easy'
                ? 'bg-green-900/30 text-green-400'
                : q.difficulty === 'medium'
                  ? 'bg-amber-900/30 text-amber-400'
                  : q.difficulty === 'hard'
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-[var(--border)]/50 text-[var(--text-muted)]'
              }`}
            title={q.difficulty ? `Difficulty: ${q.difficulty}` : 'Difficulty not set'}
          >
            {q.difficulty ?? '—'}
          </span>
          {q.leetcodeLink && (
            <a
              href={q.leetcodeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
              title="LeetCode"
              aria-label="Open on LeetCode"
            >
              <LeetCodeIcon />
            </a>
          )}
          {q.gfgLink && (
            <a
              href={q.gfgLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded bg-green-700/20 text-green-400 hover:bg-green-700/30 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
              title="GeeksForGeeks"
              aria-label="Open on GFG"
            >
              <GFGIcon />
            </a>
          )}
          {q.youtubeLink && (
            <a
              href={q.youtubeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
              title="YouTube"
              aria-label="Open on YouTube"
            >
              <YouTubeIcon />
            </a>
          )}
          <button
            type="button"
            onClick={() => toggleBookmark(q.id)}
            className={`p-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation ${bookmarked ? 'text-amber-400' : 'text-[var(--text-muted)]'} hover:bg-[var(--border)]`}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
          >
            {bookmarked ? '★' : '☆'}
          </button>
          <button
            type="button"
            onClick={() => canSaveProgress && (solved ? unmarkDone(q.id) : markDone(q.id))}
            disabled={!canSaveProgress}
            className={`p-2.5 rounded flex items-center justify-center touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 ${solved ? 'text-[var(--success)]' : 'text-[var(--text-muted)] hover:bg-[var(--border)]'} ${!canSaveProgress ? 'hover:opacity-80' : ''}`}
            title={canSaveProgress ? (solved ? 'Undo mark done' : 'Mark as done') : 'Sign in to save progress'}
            aria-label={canSaveProgress ? (solved ? 'Undo mark done' : 'Mark as done') : 'Sign in to save progress'}
          >
            <CheckCircleIcon filled={solved} />
          </button>
          {canSaveProgress && solved && (
            <button
              type="button"
              onClick={() => toggleMarkForRevision(q.id)}
              className={`p-2.5 rounded flex items-center justify-center touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 ${markedForRevision ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} hover:bg-[var(--border)]`}
              title={markedForRevision ? 'Remove from revision list' : 'Mark for revision'}
              aria-label={markedForRevision ? 'Remove from revision list' : 'Mark for revision'}
            >
              <span className="text-sm font-medium" aria-hidden>{markedForRevision ? '↻' : '↻'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowNote(!showNote)}
            className={`p-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation ${note ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} hover:bg-[var(--border)]`}
            title="Notes"
            aria-label={showNote ? 'Close notes' : 'Open notes'}
          >
            <NotesIcon />
          </button>
        </div>
      </div>
      {showNote && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
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
              className="text-sm text-[var(--accent)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-60 disabled:no-underline"
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
      )}
    </div>
  );
}
