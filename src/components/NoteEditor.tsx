import { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when the editor blurs; receives current value so parent can save without stale state */
  onBlur?: (currentValue: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** Optional ref to the textarea for focus or reading value */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const TOOLBAR_BUTTONS = [
  { label: 'Bold', prefix: '**', suffix: '**', title: 'Bold' },
  { label: 'Italic', prefix: '_', suffix: '_', title: 'Italic' },
  { label: 'Code', prefix: '`', suffix: '`', title: 'Inline code' },
  { label: 'Link', prefix: '[', suffix: '](url)', title: 'Insert link' },
  { label: '• List', prefix: '\n- ', suffix: '', title: 'Bullet list' },
  { label: '1. List', prefix: '\n1. ', suffix: '', title: 'Numbered list' },
  { label: '```', prefix: '\n```\n', suffix: '\n```', title: 'Code block' },
  { label: '#', prefix: '\n# ', suffix: '', title: 'Heading' },
] as const;

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const selected = textarea.value.slice(start, end);
  const after = textarea.value.slice(end);
  const newValue = before + prefix + selected + suffix + after;
  return newValue;
}

export function NoteEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Add notes, approach, dry run...',
  minHeight = '160px',
  textareaRef: externalRef,
}: NoteEditorProps) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalRef ?? internalRef;

  const handleToolbarClick = (prefix: string, suffix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const newValue = insertAtCursor(el, prefix, suffix);
    onChange(newValue);
    const newCursor = el.selectionStart + prefix.length;
    el.setSelectionRange(newCursor, newCursor);
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-[var(--border)] bg-[var(--bg-card)]">
        {TOOLBAR_BUTTONS.map(({ label, prefix, suffix, title }) => (
          <button
            key={label}
            type="button"
            title={title}
            onClick={() => handleToolbarClick(prefix, suffix)}
            className="px-2 py-1.5 rounded text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Edit + Preview split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-[var(--border)]">
        <div className="min-w-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => onBlur?.((e.target as HTMLTextAreaElement).value)}
            placeholder={placeholder}
            spellCheck="true"
            className="w-full min-h-[120px] p-3 text-sm text-[var(--text)] placeholder-[var(--text-muted)] bg-[var(--bg)] border-0 border-r border-[var(--border)] md:border-r resize-none focus:outline-none focus:ring-0 font-mono leading-relaxed"
            style={{ minHeight }}
          />
        </div>
        <div className="min-h-[120px] p-3 overflow-auto border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--bg-card)]">
          <div className="min-h-[100px] text-[var(--text)] text-sm [&_strong]:font-bold [&_em]:italic [&_a]:text-[var(--accent)] [&_a]:underline">
            {value.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ className, children, ...props }) => (
                    <code
                      {...props}
                      className={
                        className
                          ? 'block overflow-x-auto rounded p-3 bg-[var(--border)]/30 text-sm my-2'
                          : 'px-1.5 py-0.5 rounded bg-[var(--border)]/50 text-[var(--text)] text-sm font-mono'
                      }
                    >
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="overflow-x-auto rounded p-3 bg-[var(--border)]/30 text-sm my-2 font-mono">
                      {children}
                    </pre>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside my-1.5 space-y-0.5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside my-1.5 space-y-0.5">{children}</ol>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold mt-2 mb-1">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-bold mt-1.5 mb-0.5">{children}</h3>
                  ),
                  p: ({ children }) => <p className="mt-2 mb-2 first:mt-0 last:mb-0 [&+p]:mt-3">{children}</p>,
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-[var(--text-muted)] text-sm italic">Preview appears here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
