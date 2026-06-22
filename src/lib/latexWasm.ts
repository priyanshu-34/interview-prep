/**
 * Best-effort IN-BROWSER LaTeX → PDF compile via SwiftLaTeX (WASM).
 *
 * This is EXPERIMENTAL. A WASM TeX engine is large and its worker/wasm assets
 * don't always load cleanly from a CDN, so this can fail depending on the
 * browser/network. Every caller must treat a `null` result as "not available"
 * and fall back to the reliable Overleaf/download path.
 *
 * We load the engine lazily from a CDN so it never bloats the main bundle and
 * never breaks the build.
 */

interface PdfTeXEngineLike {
  loadEngine(): Promise<void>;
  writeMemFSFile(name: string, content: string): void;
  setEngineMainFile(name: string): void;
  compileLaTeX(): Promise<{ status: number; pdf?: Uint8Array; log?: string }>;
  flushCache?(): void;
  isReady?(): boolean;
}

const ENGINE_URL = 'https://cdn.jsdelivr.net/npm/swiftlatex@0.0.5/dist/PdfTeXEngine.js';

let enginePromise: Promise<PdfTeXEngineLike | null> | null = null;

async function getEngine(): Promise<PdfTeXEngineLike | null> {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    try {
      // Load the engine script which defines window.PdfTeXEngine.
      await new Promise<void>((resolve, reject) => {
        const w = window as unknown as { PdfTeXEngine?: unknown };
        if (w.PdfTeXEngine) return resolve();
        const s = document.createElement('script');
        s.src = ENGINE_URL;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load SwiftLaTeX engine'));
        document.head.appendChild(s);
      });
      const Ctor = (window as unknown as { PdfTeXEngine?: new () => PdfTeXEngineLike }).PdfTeXEngine;
      if (!Ctor) return null;
      const engine = new Ctor();
      await engine.loadEngine();
      return engine;
    } catch (e) {
      console.warn('[latexWasm] in-browser LaTeX engine unavailable:', (e as Error).message);
      return null;
    }
  })();
  return enginePromise;
}

/** Returns true if an in-browser compile is at least loadable. */
export async function isWasmLatexAvailable(): Promise<boolean> {
  return (await getEngine()) !== null;
}

/**
 * Compile LaTeX to a PDF Blob in the browser. Returns null if the engine
 * couldn't load or the compile failed — callers should fall back to Overleaf.
 */
export async function compileLatexToPdf(latex: string): Promise<Blob | null> {
  try {
    const engine = await getEngine();
    if (!engine) return null;
    engine.writeMemFSFile('main.tex', latex);
    engine.setEngineMainFile('main.tex');
    const result = await engine.compileLaTeX();
    engine.flushCache?.();
    if (result.status === 0 && result.pdf) {
      return new Blob([result.pdf as unknown as BlobPart], { type: 'application/pdf' });
    }
    console.warn('[latexWasm] compile failed (status ' + result.status + ')');
    return null;
  } catch (e) {
    console.warn('[latexWasm] compile error:', (e as Error).message);
    return null;
  }
}
