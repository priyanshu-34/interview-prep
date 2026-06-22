/**
 * Frontend OpenAI helpers for the Resume feature: read a JD (text or image),
 * tailor a LaTeX resume (keywords only, formatting preserved), and build a
 * keyword checklist for PDF resumes.
 *
 * Uses VITE_OPENAI_API_KEY directly from the browser (same pattern as
 * src/lib/openai.ts). Note: the key ships in the client bundle — fine for a
 * personal/local app; do not deploy publicly with a real key.
 */

import type { Checklist, ChecklistSuggestion } from '../types/resume';

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
// gpt-4o-mini supports vision (images) and is inexpensive.
const MODEL = 'gpt-4o-mini';

function apiKey(): string | null {
  const k = import.meta.env?.VITE_OPENAI_API_KEY;
  return k ? String(k).trim() : null;
}

export function isResumeAIEnabled(): boolean {
  return !!apiKey();
}

interface ChatMessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}
type ChatContent = string | ChatMessageContentPart[];

async function chat(
  messages: { role: 'system' | 'user'; content: ChatContent }[],
  opts: { json?: boolean; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const key = apiKey();
  if (!key) throw new Error('OpenAI is not configured. Add VITE_OPENAI_API_KEY to your .env file.');

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 4000,
  };
  if (opts.json) body.response_format = { type: 'json_object' };

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    let msg = `OpenAI API error: ${res.status}`;
    try {
      const j = JSON.parse(errBody);
      if (j.error?.message) msg = j.error.message;
    } catch {
      if (errBody) msg = errBody.slice(0, 200);
    }
    throw new Error(msg);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  return content as string;
}

export interface ParsedJD {
  title: string;
  company: string;
  location: string;
  jdText: string;
}

const JD_SYSTEM = `You extract structured info from a job description. Return ONLY a JSON object:
{"title":"<role title>","company":"<company or empty>","location":"<location or empty>","jdText":"<the full job description as plain text>"}`;

function coerceJD(raw: string): ParsedJD {
  let p: Record<string, unknown> = {};
  try { p = JSON.parse(raw); } catch { /* fall through */ }
  return {
    title: typeof p.title === 'string' && p.title ? p.title : 'Untitled role',
    company: typeof p.company === 'string' ? p.company : '',
    location: typeof p.location === 'string' ? p.location : '',
    jdText: typeof p.jdText === 'string' && p.jdText ? p.jdText : raw,
  };
}

/** Parse a JD from pasted text. Falls back to raw text if AI isn't configured. */
export async function jdFromText(text: string): Promise<ParsedJD> {
  if (!text.trim()) throw new Error('Paste the job description first.');
  if (!isResumeAIEnabled()) {
    const firstLine = text.split('\n').find((l) => l.trim()) || 'Job';
    return { title: firstLine.slice(0, 80), company: '', location: '', jdText: text.trim() };
  }
  const content = await chat(
    [
      { role: 'system', content: JD_SYSTEM },
      { role: 'user', content: `Extract from this job description:\n\n${text.slice(0, 12000)}` },
    ],
    { json: true, temperature: 0 }
  );
  return coerceJD(content);
}

/** Parse a JD from a screenshot image (data URL base64). Requires AI. */
export async function jdFromImage(dataUrl: string): Promise<ParsedJD> {
  if (!isResumeAIEnabled()) throw new Error('Reading a JD image needs VITE_OPENAI_API_KEY.');
  const content = await chat(
    [
      { role: 'system', content: JD_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'This image is a screenshot of a job posting. Read ALL the text and extract the fields. Put the complete job description into jdText.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    { json: true, temperature: 0 }
  );
  return coerceJD(content);
}

const LATEX_SYSTEM = `You tailor a LaTeX resume to a job description.
ABSOLUTE RULES:
1. Return ONLY the complete LaTeX document — no commentary, no markdown fences.
2. Preserve formatting EXACTLY: never change \\documentclass, the preamble, packages, commands, custom macros, environments, spacing, margins, or structure.
3. Edit ONLY human-readable text: reorder/inject skills + keywords to match the JD, and lightly rephrase existing bullet wording to mirror the JD's language.
4. NEVER invent new skills, employers, projects, titles, dates, or metrics.
5. Output MUST still compile (balanced braces/environments).`;

function unfence(t: string): string {
  const m = t.match(/```(?:latex|tex)?\s*([\s\S]*?)```/);
  return (m ? m[1] : t).trim();
}
function validLatex(out: string, base: string): boolean {
  return (
    !!out &&
    /\\documentclass/.test(out) &&
    /\\begin\{document\}/.test(out) &&
    /\\end\{document\}/.test(out) &&
    out.length >= base.length * 0.5
  );
}
function diffKeywords(base: string, tailored: string): string[] {
  const tok = (s: string) =>
    new Set(
      s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
    );
  const b = tok(base);
  return [...tok(tailored)].filter((w) => !b.has(w)).slice(0, 30);
}

export interface TailorLatexResult {
  latexSource: string;
  addedKeywords: string[];
}

/** Tailor a LaTeX resume: edit wording only, preserve formatting. */
export async function tailorLatex(
  baseSource: string,
  job: { title: string; company: string; jdText: string }
): Promise<TailorLatexResult> {
  if (!isResumeAIEnabled()) throw new Error('Tailoring needs VITE_OPENAI_API_KEY.');
  const out = unfence(
    await chat(
      [
        { role: 'system', content: LATEX_SYSTEM },
        {
          role: 'user',
          content:
            `JOB: ${job.title} @ ${job.company || '—'}\n` +
            `JOB DESCRIPTION:\n${(job.jdText || '').slice(0, 8000)}\n\n` +
            `Tailor this resume LaTeX (return the full tailored .tex):\n\n${baseSource}`,
        },
      ],
      { temperature: 0.2, maxTokens: 8000 }
    )
  );
  const latexSource = validLatex(out, baseSource) ? out : baseSource;
  return { latexSource, addedKeywords: diffKeywords(baseSource, latexSource) };
}

const CHECKLIST_SYSTEM = `You are a resume coach. Compare a candidate's resume text to a job description and produce a keyword/edit CHECKLIST to improve ATS match WITHOUT fabricating anything. Return ONLY JSON:
{
  "missingKeywords": ["<JD keyword/skill not in the resume but plausibly true for the candidate>"],
  "presentKeywords": ["<important JD keyword already in the resume>"],
  "suggestions": [{"where":"<section/bullet>","change":"<concrete rephrasing that adds JD language to an EXISTING point>"}],
  "doNotAdd": ["<JD keyword the candidate shows no evidence for — do NOT claim it>"]
}`;

/** Build a keyword/edit checklist for a PDF (text) resume. */
export async function pdfChecklist(
  resumeText: string,
  job: { title: string; company: string; jdText: string }
): Promise<Checklist> {
  if (!isResumeAIEnabled()) throw new Error('The keyword checklist needs VITE_OPENAI_API_KEY.');
  const content = await chat(
    [
      { role: 'system', content: CHECKLIST_SYSTEM },
      {
        role: 'user',
        content:
          `JOB: ${job.title} @ ${job.company || '—'}\n` +
          `JOB DESCRIPTION:\n${(job.jdText || '').slice(0, 8000)}\n\n` +
          `RESUME TEXT:\n${(resumeText || '').slice(0, 8000)}`,
      },
    ],
    { json: true, temperature: 0.2 }
  );
  let p: Record<string, unknown> = {};
  try { p = JSON.parse(content); } catch { /* ignore */ }
  const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const suggestions: ChecklistSuggestion[] = Array.isArray(p.suggestions)
    ? (p.suggestions as Record<string, unknown>[])
        .filter((s) => s && (typeof s.where === 'string' || typeof s.change === 'string'))
        .map((s) => ({ where: String(s.where ?? ''), change: String(s.change ?? '') }))
    : [];
  return {
    missingKeywords: strArr(p.missingKeywords),
    presentKeywords: strArr(p.presentKeywords),
    suggestions,
    doNotAdd: strArr(p.doNotAdd),
  };
}
