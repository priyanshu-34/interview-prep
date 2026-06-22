/**
 * Helpers to get a tailored .tex out of the browser:
 *  - download it as a file
 *  - open it directly in Overleaf (creates a new project from the snippet)
 */

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Open LaTeX in Overleaf as a new project. Overleaf accepts a POST to
 * /docs with `snip` (raw content) and `engine`. We submit a transient form.
 */
export function openInOverleaf(latex: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://www.overleaf.com/docs';
  form.target = '_blank';
  form.style.display = 'none';

  const snip = document.createElement('textarea');
  snip.name = 'snip';
  snip.value = latex;
  form.appendChild(snip);

  const engine = document.createElement('input');
  engine.name = 'engine';
  engine.value = 'pdflatex';
  form.appendChild(engine);

  document.body.appendChild(form);
  form.submit();
  form.remove();
}
