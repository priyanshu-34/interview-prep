import type { Question } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useActivity } from '../hooks/useActivity';
import { useNotes } from '../hooks/useNotes';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface QuestionRowProps {
  q: Question;
  showTopic?: boolean;
  topicName?: string;
}

export function QuestionRow({ q, showTopic, topicName }: QuestionRowProps) {
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isSolved, markDone, unmarkDone } = useActivity();
  const { getNote, setNote } = useNotes();
  const [showNote, setShowNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  const bookmarked = isBookmarked(q.id);
  const solved = isSolved(q.id);
  const note = getNote(q.id);
  const canSaveProgress = !!user;

  useEffect(() => {
    if (showNote) setNoteContent(getNote(q.id)?.content ?? '');
  }, [showNote, q.id, getNote]);

  const saveNote = (contentToSave: string) => {
    setNote(q.id, contentToSave);
    setShowNote(false);
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        {showTopic && topicName && (
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded">
            {topicName}
          </span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded capitalize w-16 text-center ${
            q.difficulty === 'easy'
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
        <span className="font-medium text-[var(--text)] flex-1 min-w-0">{q.title}</span>
        <div className="flex items-center gap-2 flex-wrap">
          {q.leetcodeLink && (
            <a
              href={q.leetcodeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-2 py-1 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
            >
              LeetCode
            </a>
          )}
          {q.gfgLink && (
            <a
              href={q.gfgLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-2 py-1 rounded bg-green-700/20 text-green-400 hover:bg-green-700/30"
            >
              GFG
            </a>
          )}
          {q.youtubeLink && (
            <a
              href={q.youtubeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-2 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
            >
              YouTube
            </a>
          )}
          <button
            type="button"
            onClick={() => toggleBookmark(q.id)}
            className={`p-1.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${bookmarked ? 'text-amber-400' : 'text-[var(--text-muted)]'} hover:bg-[var(--border)]`}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
          >
            {bookmarked ? '★' : '☆'}
          </button>
          <button
            type="button"
            onClick={() => canSaveProgress && (solved ? unmarkDone(q.id) : markDone(q.id))}
            disabled={!canSaveProgress}
            className={`text-sm px-2 py-1 rounded border cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              solved ? 'border-[var(--success)] text-[var(--success)] bg-[var(--success)]/10' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)]'
            } ${!canSaveProgress ? 'hover:opacity-80' : ''}`}
            title={canSaveProgress ? (solved ? 'Undo mark done' : 'Mark as done') : 'Sign in to save progress'}
            aria-label={canSaveProgress ? (solved ? 'Undo mark done' : 'Mark as done') : 'Sign in to save progress'}
          >
            {solved ? 'Done' : 'Mark done'}
          </button>
          <button
            type="button"
            onClick={() => setShowNote(!showNote)}
            className={`p-1.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${note ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} hover:bg-[var(--border)]`}
            title="Notes"
            aria-label={showNote ? 'Close notes' : 'Open notes'}
          >
            📝
          </button>
        </div>
      </div>
      {showNote && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onBlur={(e) => saveNote((e.target as HTMLTextAreaElement).value)}
            placeholder="Add notes (Markdown supported)..."
            className="w-full min-h-[80px] rounded border border-[var(--border)] bg-[var(--bg)] p-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] resize-y"
          />
          {noteContent.trim() && (
            <div className="note-preview mt-2 rounded border border-[var(--border)] bg-[var(--bg)] p-2 text-sm text-[var(--text)]">
              <ReactMarkdown>{noteContent}</ReactMarkdown>
            </div>
          )}
          <button type="button" onClick={() => saveNote(noteContent)} className="mt-2 text-sm text-[var(--accent)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
            Save note
          </button>
        </div>
      )}
    </div>
  );
}
