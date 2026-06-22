// Resume feature types.

export type ResumeFormat = 'latex' | 'pdf';

export interface BaseResume {
  label: string;
  format: ResumeFormat;
  latexSource?: string; // present when format === 'latex'
  rawText: string; // LaTeX source, or extracted text for PDF
  updatedAt: string; // ISO
}

export type JobStatus = 'saved' | 'tailored' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export const JOB_STATUSES: JobStatus[] = ['saved', 'tailored', 'applied', 'interviewing', 'offer', 'rejected'];

export interface ChecklistSuggestion {
  where: string;
  change: string;
}

export interface Checklist {
  missingKeywords: string[];
  presentKeywords: string[];
  suggestions: ChecklistSuggestion[];
  doNotAdd: string[];
}

export interface LatexVariant {
  format: 'latex';
  latexSource: string;
  addedKeywords: string[];
}

export interface ChecklistVariant {
  format: 'checklist';
  checklist: Checklist;
}

export type ResumeVariant = LatexVariant | ChecklistVariant;

export interface ResumeJob {
  id: string;
  title: string;
  company: string;
  location: string;
  jdText: string;
  source: 'text' | 'image';
  status: JobStatus;
  notes: string;
  createdAt: string; // ISO
  appliedAt: string | null;
  variant: ResumeVariant | null;
}
