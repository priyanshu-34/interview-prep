import { useActivity } from '../hooks/useActivity';
import { useActivityHeatmap } from '../hooks/useActivity';
import { useQuestions } from '../contexts/QuestionsContext';

export function ExportProgressButton() {
  const { solvedIds } = useActivity();
  const { getQuestionById } = useQuestions();
  const daysData = useActivityHeatmap();

  const exportJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      solvedCount: solvedIds.length,
      solvedQuestionIds: solvedIds,
      activityByDate: daysData,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `algointerview-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = [
      ['questionId', 'title'],
      ...solvedIds.map((id) => {
        const q = getQuestionById(id);
        return [id, q?.title ?? ''];
      }),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `algointerview-progress-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <h2 className="text-lg font-semibold text-[var(--text)] w-full mb-1">Export progress</h2>
      <button
        type="button"
        onClick={exportJson}
        className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:bg-[var(--border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        Download JSON
      </button>
      <button
        type="button"
        onClick={exportCsv}
        className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:bg-[var(--border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        Download CSV
      </button>
    </div>
  );
}
