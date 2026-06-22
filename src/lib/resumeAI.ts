/**
 * Frontend OpenAI helpers for the Resume feature: read a JD (text or image),
 * tailor a LaTeX resume (keywords only, formatting preserved), and build a
 * keyword checklist for PDF resumes.
 *
 * Uses VITE_OPENAI_API_KEY directly from the browser (same pattern as
 * src/lib/openai.ts). Note: the key ships in the client bundle — fine for a
 * personal/local app; do not deploy publicly with a real key.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Checklist, ChecklistSuggestion } from '../types/resume';

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
// gpt-4o-mini supports vision (images) and is inexpensive.
const MODEL = 'gpt-4o-mini';

/* -------------------- Editable prompts (admin) -------------------- */
// Defaults live here; admins can override them + add custom tailoring prompts,
// stored in Firestore at config/resumePrompts (admin-writable per firestore.rules).

export interface CustomPrompt {
  id: string;
  name: string;
  prompt: string;
}
export interface ResumePrompts {
  tailor: string;
  jd: string;
  checklist: string;
  analyze: string;
  custom: CustomPrompt[];
}

const PROMPTS_REF = 'resumePrompts';
let promptsCache: ResumePrompts | null = null;

function defaults(): ResumePrompts {
  return {
    tailor: DEFAULT_TAILOR_PROMPT,
    jd: DEFAULT_JD_PROMPT,
    checklist: DEFAULT_CHECKLIST_PROMPT,
    analyze: DEFAULT_ANALYZE_PROMPT,
    custom: [],
  };
}

/** Load prompts from Firestore (cached), falling back to defaults. */
export async function loadResumePrompts(force = false): Promise<ResumePrompts> {
  if (promptsCache && !force) return promptsCache;
  const d = defaults();
  try {
    const snap = await getDoc(doc(db, 'config', PROMPTS_REF));
    if (snap.exists()) {
      const v = snap.data() as Partial<ResumePrompts>;
      promptsCache = {
        tailor: typeof v.tailor === 'string' && v.tailor.trim() ? v.tailor : d.tailor,
        jd: typeof v.jd === 'string' && v.jd.trim() ? v.jd : d.jd,
        checklist: typeof v.checklist === 'string' && v.checklist.trim() ? v.checklist : d.checklist,
        analyze: typeof v.analyze === 'string' && v.analyze.trim() ? v.analyze : d.analyze,
        custom: Array.isArray(v.custom)
          ? v.custom
              .filter((c): c is CustomPrompt => !!c && typeof c.name === 'string' && typeof c.prompt === 'string')
              .map((c) => ({ id: String(c.id || c.name), name: c.name, prompt: c.prompt }))
          : [],
      };
      return promptsCache;
    }
  } catch {
    // keep defaults
  }
  promptsCache = d;
  return promptsCache;
}

/** Save prompts to Firestore (admin only, enforced by rules) and update cache. */
export async function saveResumePrompts(p: ResumePrompts): Promise<void> {
  await setDoc(doc(db, 'config', PROMPTS_REF), p);
  promptsCache = p;
}

export function getDefaultResumePrompts(): ResumePrompts {
  return defaults();
}

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

export const DEFAULT_JD_PROMPT = `You extract structured information from a job description (which may be raw text or read from a screenshot image). Capture the role's title, company, and location accurately, and put the COMPLETE job description — every requirement, responsibility, skill, tool, and keyword, verbatim and unsummarised — into jdText so it can be used for ATS keyword matching. Do not omit or paraphrase requirements; preserve the employer's exact terminology. Return ONLY this JSON object:
{"title":"<role title>","company":"<company or empty>","location":"<location or empty>","jdText":"<the full, verbatim job description as plain text>"}`;

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
  const prompts = await loadResumePrompts();
  const content = await chat(
    [
      { role: 'system', content: prompts.jd },
      { role: 'user', content: `Extract from this job description:\n\n${text.slice(0, 12000)}` },
    ],
    { json: true, temperature: 0 }
  );
  return coerceJD(content);
}

/** Parse a JD from a screenshot image (data URL base64). Requires AI. */
export async function jdFromImage(dataUrl: string): Promise<ParsedJD> {
  if (!isResumeAIEnabled()) throw new Error('Reading a JD image needs VITE_OPENAI_API_KEY.');
  const prompts = await loadResumePrompts();
  const content = await chat(
    [
      { role: 'system', content: prompts.jd },
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

export const DEFAULT_TAILOR_PROMPT = `You are an elite technical recruiter, certified ATS (Applicant Tracking System) optimization specialist, and professional resume writer. You tailor a candidate's LaTeX resume to ONE specific job description so it ranks as high as possible in ATS keyword screening AND impresses the human recruiter who reads it next — without ever fabricating anything.

HOW MODERN ATS SCORE (optimize for this):
- They parse the resume to text and match it against the JD: exact keywords first, then close semantic matches, plus job-title alignment and a skills taxonomy (tool/skill + seniority).
- Hard skills, tools, frameworks, and exact role terminology carry the MOST weight; then title alignment; then everything else.
- ATS frequently do NOT recognise synonyms, so MIRROR the JD's exact wording for any skill the candidate genuinely has.
- Both ATS and recruiters reward "achievement density": bullets with concrete numbers/outcomes.

YOUR METHOD:
1. Extract from the JD: required hard skills/tools/technologies, methodologies, the target job title, core responsibilities, and which items are must-haves vs nice-to-haves.
2. Map each JD requirement to REAL evidence already present in the resume.
3. For every genuine match, align the resume's wording to the JD's exact terminology (e.g. if the JD says "CI/CD", "REST APIs", "event-driven", use those exact phrases). Where natural, include an acronym and its expansion once, e.g. "CI/CD (continuous integration / continuous delivery)".
4. Reorder the skills/technologies list so the most JD-relevant items appear first.
5. Weave the important keywords into EXISTING bullet points in natural context — never a keyword dump. Aim for each key term to appear ~2–3 times across the resume in different, truthful contexts.
6. Strengthen bullets with strong action verbs and KEEP every existing quantified result. Never invent, inflate, or alter numbers/metrics.
7. If the structure allows reordering within a section, surface the most JD-relevant experience/projects higher.
8. Focus on elevating relevant content; leave genuinely irrelevant lines intact rather than deleting them.

ABSOLUTE RULES:
- Return ONLY the complete, compilable LaTeX document. No commentary, no explanation, no markdown code fences.
- Preserve formatting EXACTLY. Do NOT change \\documentclass, the preamble, packages, custom macros/commands, environments, margins, spacing, fonts, colours, section ordering, or any layout. Change ONLY the human-readable text inside existing commands/bullets.
- NEVER fabricate or imply skills, tools, employers, titles, dates, degrees, certifications, or metrics the candidate does not already have. If a JD keyword has no basis in the resume, DO NOT add it.
- No keyword stuffing: every edit must read naturally and truthfully to a human recruiter.
- Keep the resume's length roughly the same; do not overflow onto a new page.
- The output MUST still compile (balanced braces and environments).`;

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
export const DEFAULT_ANALYZE_PROMPT = `You are an ATS (Applicant Tracking System) scoring engine combined with a senior technical recruiter. You receive a job description and TWO versions of a candidate's resume: BEFORE and AFTER tailoring. Resumes may be in LaTeX — read the human-readable content and ignore LaTeX commands.

SCORING METHOD — apply the SAME method to BEFORE and AFTER, each scored against the JD (0-100):
1. Identify the JD's must-have hard skills/tools/technologies, core responsibilities, required job title, and seniority/years.
2. Compute weighted coverage:
   - ~50%: required hard skills/tools/keywords present (exact wording = full credit, clear semantic match = partial, missing = none; must-haves weigh more than nice-to-haves).
   - ~20%: job-title / role alignment.
   - ~15%: responsibilities / domain overlap.
   - ~10%: seniority / experience-level fit.
   - ~5%: achievement density (quantified outcomes).
3. Calibrate realistically and do NOT inflate: 85-100 = strong, likely to pass ATS; 70-84 = good; 50-69 = partial; below 50 = weak. An off-target or generic resume must score low.

Then produce:
- "summary": 3-8 short, concrete bullet phrases of what the tailoring changed (skills surfaced, JD wording mirrored, bullets aligned, keywords added).
- "keywordsAdded": the specific JD keywords/skills now present or emphasised in AFTER that were weak or absent in BEFORE.

Return ONLY this JSON object, nothing else:
{"scoreBefore":<int 0-100>,"scoreAfter":<int 0-100>,"summary":["<change>", ...],"keywordsAdded":["<keyword>", ...]}`;

export interface TailorAnalysis {
  scoreBefore: number;
  scoreAfter: number;
  summary: string[];
  keywordsAdded: string[];
}

function clampScore(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function analyzeTailoring(
  jdText: string,
  before: string,
  after: string
): Promise<TailorAnalysis> {
  const prompts = await loadResumePrompts();
  const content = await chat(
    [
      { role: 'system', content: prompts.analyze },
      {
        role: 'user',
        content:
          `JOB DESCRIPTION:\n${jdText.slice(0, 6000)}\n\n` +
          `BEFORE:\n${before.slice(0, 7000)}\n\n` +
          `AFTER:\n${after.slice(0, 7000)}`,
      },
    ],
    { json: true, temperature: 0 }
  );
  let p: Record<string, unknown> = {};
  try { p = JSON.parse(content); } catch { /* ignore */ }
  const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  return {
    scoreBefore: clampScore(p.scoreBefore),
    scoreAfter: clampScore(p.scoreAfter),
    summary: strArr(p.summary).slice(0, 12),
    keywordsAdded: strArr(p.keywordsAdded).slice(0, 30),
  };
}

export interface TailorLatexResult {
  latexSource: string;
  addedKeywords: string[];
  summary: string[];
  atsBefore: number;
  atsAfter: number;
}

/** Tailor a LaTeX resume: edit wording only, preserve formatting. Also returns
 * an ATS score before/after and a human-readable change summary. */
export async function tailorLatex(
  baseSource: string,
  job: { title: string; company: string; jdText: string },
  opts?: { systemPrompt?: string; extraInstructions?: string }
): Promise<TailorLatexResult> {
  if (!isResumeAIEnabled()) throw new Error('Tailoring needs VITE_OPENAI_API_KEY.');
  const prompts = await loadResumePrompts();
  const systemPrompt = (opts?.systemPrompt && opts.systemPrompt.trim()) || prompts.tailor;
  const tweaks = (opts?.extraInstructions || '').trim();
  const out = unfence(
    await chat(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `JOB: ${job.title} @ ${job.company || '—'}\n` +
            `JOB DESCRIPTION:\n${(job.jdText || '').slice(0, 8000)}\n\n` +
            (tweaks
              ? `ADDITIONAL INSTRUCTIONS FROM THE CANDIDATE (apply these tweaks, but never violate the absolute rules and never fabricate):\n${tweaks}\n\n`
              : '') +
            `Tailor this resume LaTeX (return the full tailored .tex):\n\n${baseSource}`,
        },
      ],
      { temperature: 0.2, maxTokens: 8000 }
    )
  );
  const latexSource = validLatex(out, baseSource) ? out : baseSource;
  const analysis = await analyzeTailoring(job.jdText || '', baseSource, latexSource);
  return {
    latexSource,
    addedKeywords: analysis.keywordsAdded,
    summary: analysis.summary,
    atsBefore: analysis.scoreBefore,
    atsAfter: analysis.scoreAfter,
  };
}

export const DEFAULT_CHECKLIST_PROMPT = `You are an ATS (Applicant Tracking System) evaluator and expert resume coach. Compare a candidate's resume text to a job description, score the current ATS match, and produce an actionable checklist to raise it — WITHOUT fabricating anything.

SCORING METHOD (0-100, realistic, do NOT inflate):
~50% required hard skills/tools/keywords present (exact wording = full credit, clear semantic match = partial, missing = none; must-haves weigh more), ~20% job-title/role alignment, ~15% responsibilities/domain overlap, ~10% seniority fit, ~5% quantified achievements. 85+ = strong, 70-84 = good, 50-69 = partial, below 50 = weak.

GUIDELINES:
- "missingKeywords": important JD skills/keywords absent from the resume that are plausibly TRUE for this candidate and should be added — use the JD's exact wording.
- "presentKeywords": key JD keywords already in the resume.
- "suggestions": concrete edits to EXISTING bullets/sections that weave in JD language and, where genuine, add measurable outcomes. Never invent numbers or experience.
- "doNotAdd": JD keywords the resume shows NO evidence for — explicitly warn the candidate not to claim these.

Return ONLY this JSON object:
{
  "score": <int 0-100>,
  "missingKeywords": ["..."],
  "presentKeywords": ["..."],
  "suggestions": [{"where":"<section/bullet>","change":"<concrete rephrasing>"}],
  "doNotAdd": ["..."]
}`;

/** Build a keyword/edit checklist for a PDF (text) resume. */
export async function pdfChecklist(
  resumeText: string,
  job: { title: string; company: string; jdText: string }
): Promise<Checklist> {
  if (!isResumeAIEnabled()) throw new Error('The keyword checklist needs VITE_OPENAI_API_KEY.');
  const prompts = await loadResumePrompts();
  const content = await chat(
    [
      { role: 'system', content: prompts.checklist },
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
  const score = (() => {
    const n = typeof p.score === 'number' ? p.score : Number(p.score);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  })();
  return {
    score,
    missingKeywords: strArr(p.missingKeywords),
    presentKeywords: strArr(p.presentKeywords),
    suggestions,
    doNotAdd: strArr(p.doNotAdd),
  };
}
