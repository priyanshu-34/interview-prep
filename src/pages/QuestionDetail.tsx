import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useState } from 'react';
import { useQuestions } from '../contexts/QuestionsContext';
import { useTopics } from '../contexts/TopicsContext';
// import { useTrack } from '../contexts/TrackContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useActivity } from '../hooks/useActivity';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin } from '../lib/admin';
import { CheckCircleIcon } from '../components/Icons';
import { QuestionForm } from '../components/QuestionForm';

const isSystemDesign = (trackId: string) => trackId === 'system-design';

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent)] hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => (
    <code
      {...props}
      className={
        className
          ? 'block overflow-x-auto rounded p-3 bg-[var(--border)]/30 text-sm my-2 font-mono'
          : 'px-1.5 py-0.5 rounded bg-[var(--border)]/50 text-[var(--text)] text-sm font-mono'
      }
    >
      {children}
    </code>
  ),
};

export function QuestionDetail() {
  const { questionId } = useParams<{ questionId: string }>();
  const decodedId = questionId ? decodeURIComponent(questionId) : '';
  const { getQuestionById, refetch } = useQuestions();
  // const { trackId } = useTrack();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isSolved, markDone, unmarkDone } = useActivity();
  const { user } = useAuth();

  const { getTopicById } = useTopics();
  const q = decodedId ? getQuestionById(decodedId) : undefined;
  const topic = q ? getTopicById(q.topicId) : undefined;
  const systemDesign = q ? isSystemDesign(q.trackId) : false;
  const canSaveProgress = !!user;
  const bookmarked = q ? isBookmarked(q.id) : false;
  const solved = q ? isSolved(q.id) : false;
  const showEditLink = !!user && isAdmin(user.email ?? undefined);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (!decodedId || !q) {
    return (
      <div>
        <Link to="/" className="text-[var(--accent)] hover:underline text-sm">← Dashboard</Link>
        <p className="mt-4 text-[var(--text-muted)]">Question not found.</p>
      </div>
    );
  }

  const backHref = topic ? `/topic/${encodeURIComponent(topic.id)}` : '/cumulative';
  const useLinksArray = q.links && q.links.length > 0;
  const linkLabels = systemDesign
    ? { leetcode: 'Article 1', gfg: 'Article 2', youtube: 'Video' }
    : { leetcode: 'LeetCode', gfg: 'GFG', youtube: 'YouTube' };

  return (
    <div className="max-w-3xl">
      <Link to={backHref} className="text-[var(--accent)] hover:underline text-sm sm:text-base">
        ← Back to {topic ? topic.name : 'Cumulative'}
      </Link>

      <div className="mt-4 sm:mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {topic && (
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg)] px-2 py-1 rounded">
              {topic.name}
            </span>
          )}
          <span
            className={`text-xs px-2 py-1 rounded capitalize ${
              q.difficulty === 'easy'
                ? 'bg-green-900/30 text-green-400'
                : q.difficulty === 'medium'
                  ? 'bg-amber-900/30 text-amber-400'
                  : q.difficulty === 'hard'
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-[var(--border)]/50 text-[var(--text-muted)]'
            }`}
          >
            {q.difficulty ?? '—'}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4">
          {systemDesign ? 'Problem' : 'Question'}
        </h1>
        <p className="text-[var(--text)] text-base sm:text-lg font-medium mb-3">{q.title}</p>
        {q.description && (
          <div className="question-markdown text-[var(--text)] text-sm sm:text-base mb-6">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
              {q.description}
            </ReactMarkdown>
          </div>
        )}
        {!q.description && (
          <p className="text-[var(--text-muted)] text-sm mb-6">
            {systemDesign
              ? 'Use the resources below to read and understand this topic.'
              : 'No problem description added yet. Use the links below to solve on LeetCode, GFG, or YouTube.'}
          </p>
        )}

        {q.explanation && (
          <>
            <h2 className="text-base font-semibold text-[var(--text)] mb-2 mt-6">
              {systemDesign ? 'Explanation' : 'Solution / Approach'}
            </h2>
            <div className="question-markdown text-[var(--text)] text-sm sm:text-base mb-6">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                {q.explanation}
              </ReactMarkdown>
            </div>
          </>
        )}

        <h2 className="text-base font-semibold text-[var(--text)] mb-3">
          {systemDesign ? 'Resources to read and understand' : 'Resources'}
        </h2>
        <ul className="space-y-3">
          {useLinksArray ? (
            q.links!.map((item, i) => (
              <li key={i}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline font-medium"
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" aria-hidden />
                  {item.label || `Resource ${i + 1}`}
                </a>
                <span className="text-[var(--text-muted)] text-xs ml-4 break-all block mt-0.5">{item.url}</span>
              </li>
            ))
          ) : (
            <>
              {q.leetcodeLink && (
                <li>
                  <a
                    href={q.leetcodeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden />
                    {linkLabels.leetcode}
                  </a>
                  <span className="text-[var(--text-muted)] text-xs ml-4 break-all">{q.leetcodeLink}</span>
                </li>
              )}
              {q.gfgLink && (
                <li>
                  <a
                    href={q.gfgLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" aria-hidden />
                    {linkLabels.gfg}
                  </a>
                  <span className="text-[var(--text-muted)] text-xs ml-4 break-all">{q.gfgLink}</span>
                </li>
              )}
              {q.youtubeLink && (
                <li>
                  <a
                    href={q.youtubeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-hidden />
                    {linkLabels.youtube}
                  </a>
                  <span className="text-[var(--text-muted)] text-xs ml-4 break-all">{q.youtubeLink}</span>
                </li>
              )}
              {!q.leetcodeLink && !q.gfgLink && !q.youtubeLink && (
                <li className="text-[var(--text-muted)] text-sm">No links added yet.</li>
              )}
            </>
          )}
        </ul>

        <div className="mt-6 pt-4 border-t border-[var(--border)] flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => toggleBookmark(q.id)}
            className={`px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              bookmarked ? 'text-amber-400 border-amber-500/50' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
          <button
            type="button"
            onClick={() => canSaveProgress && (solved ? unmarkDone(q.id) : markDone(q.id))}
            disabled={!canSaveProgress}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] text-[var(--text)] hover:bg-[var(--bg)]"
          >
            <CheckCircleIcon filled={solved} className="w-4 h-4" />
            {solved ? 'Undo mark done' : 'Mark as done'}
          </button>
          <Link
            to={`/notes`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Open notes →
          </Link>
          {showEditLink && (
            <button
              type="button"
              onClick={() => { setShowEditForm(true); setEditError(null); }}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Edit question (admin) →
            </button>
          )}
        </div>
      </div>
      {showEditForm && showEditLink && q && (
        <QuestionForm
          question={q}
          onClose={() => { setShowEditForm(false); setEditError(null); }}
          onSaved={async () => { await refetch(); setShowEditForm(false); setEditError(null); }}
          onError={(msg) => setEditError(msg)}
        />
      )}
      {editError && (
        <p className="mt-3 text-sm text-red-400">{editError}</p>
      )}
    </div>
  );
}
