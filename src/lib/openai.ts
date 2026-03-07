/**
 * OpenAI helper for admin: generate question data from a topic name.
 * Set VITE_OPENAI_API_KEY in .env for the Admin "Generate with AI" feature.
 */

export interface GeneratedQuestionData {
  title: string;
  description: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard' | '';
  leetcodeLink: string;
  gfgLink: string;
  youtubeLink: string;
  links?: { label: string; url: string }[];
}

/** Default system prompt for DSA track. Exported so admin can load/edit in Firestore. */
export const DEFAULT_SYSTEM_PROMPT_DSA = `You are a DSA (Data Structures and Algorithms) interview prep assistant. Given a topic name, generate a single practice question suitable for that topic.

Respond with a valid JSON object only, no markdown or extra text. Use this exact shape:
{
  "title": "Short question title (e.g. Two Sum)",
  "description": "2-4 sentence problem statement or what to study",
  "explanation": "Brief solution approach or key points (2-3 sentences)",
  "difficulty": "easy" | "medium" | "hard",
  "leetcodeLink": "Full LeetCode URL if a well-known problem exists, else empty string",
  "gfgLink": "Full GeeksForGeeks URL if relevant, else empty string",
  "youtubeLink": "Relevant YouTube URL if you know one, else empty string",
  "links": [{"label": "Article", "url": "https://..."}, ...] or [] if none
}

Prefer real problem names and real URLs when they exist (e.g. "Two Sum" with leetcode.com/problems/two-sum). Keep description and explanation concise.`;

/** Default system prompt for System Design track. Exported so admin can load/edit in Firestore. */
export const DEFAULT_SYSTEM_PROMPT_SYSTEM_DESIGN = `
You are an expert System Design interview coach helping software engineers prepare for technical interviews.

Your task is to generate a system design topic explanation suitable for an interview preparation website.

Return ONLY a valid JSON object. Do NOT include markdown code fences or extra text.

The JSON must follow this exact structure:

{
  "title": "Topic name (e.g. Load Balancing, Consistent Hashing, Design URL Shortener)",
  "description": "2-4 sentences describing the concept or system design problem. Clearly state what the concept is and why it matters in scalable systems.",
  "explanation": "Detailed explanation in MARKDOWN using the required structure below.",
  "difficulty": "easy" | "medium" | "hard",
  "leetcodeLink": "",
  "gfgLink": "",
  "youtubeLink": "",
  "links": [
    {"label": "Article", "url": "https://..."},
    {"label": "Video", "url": "https://..."}
  ]
}

The explanation MUST be written in Markdown using the following exact structure:

## Concept
Explain what the concept is in simple terms.

## Why it is needed
Explain the problem this concept solves in scalable systems.

## How it works
Explain the architecture, mechanisms, algorithms, or design patterns involved. Use bullet points when appropriate.

## Advantages
List key benefits of using this concept.

## Disadvantages
Mention limitations, tradeoffs, or complexity.

## Real-world examples
Mention real systems or companies using this concept (e.g., Netflix, Google, Amazon, etc.).

## Interview tips
Explain how candidates should talk about this concept in system design interviews. Include 1 short example interview answer when useful.

## Common interview questions
Include 3–5 frequently asked interview questions about this concept.
For each question, provide a short suggested answer (5-8 sentences) explaining how a candidate should respond.

Guidelines:
- Explanations must be clear and beginner-friendly but still technically correct.
- Focus on concepts useful for Software Engineering interviews.
- Prefer widely used real-world technologies and architectures.
- Avoid overly academic explanations.
- Use bullet points for readability.
- Keep the explanation easy to understand and informative. Do not use too many technical terms. 

Resources:
- Include 3-5 high quality links when possible.
- Prefer sources such as:
  - medium.com
  - youtube.com
  etc which are reliable sources for the topic.

If you do not know a reliable link, leave the field empty or use an empty array.

Your output must be a valid JSON object only.
`;

function getSystemPrompt(trackId: string): string {
  return trackId === 'system-design' ? DEFAULT_SYSTEM_PROMPT_SYSTEM_DESIGN : DEFAULT_SYSTEM_PROMPT_DSA;
}

/** Resolve system prompt for a track (used when no override is passed). */
export function getDefaultSystemPrompt(trackId: string): string {
  return getSystemPrompt(trackId);
}

function getApiKey(): string | null {
  return typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENAI_API_KEY
    ? String(import.meta.env.VITE_OPENAI_API_KEY).trim()
    : null;
}

export function isOpenAIEnabled(): boolean {
  return !!getApiKey();
}

/** Current question data sent to the AI when editing (so it can update/improve rather than generate from scratch). */
export interface ExistingQuestionData {
  title?: string;
  description?: string;
  explanation?: string;
  difficulty?: string;
  leetcodeLink?: string;
  gfgLink?: string;
  youtubeLink?: string;
  links?: { label: string; url: string }[];
}

function buildExistingQuestionBlock(existing: ExistingQuestionData): string {
  const parts: string[] = [];
  if (existing.title?.trim()) parts.push(`Title: ${existing.title.trim()}`);
  if (existing.description?.trim()) parts.push(`Description: ${existing.description.trim()}`);
  if (existing.explanation?.trim()) parts.push(`Explanation: ${existing.explanation.trim()}`);
  if (existing.difficulty?.trim()) parts.push(`Difficulty: ${existing.difficulty.trim()}`);
  if (existing.leetcodeLink?.trim()) parts.push(`LeetCode link: ${existing.leetcodeLink.trim()}`);
  if (existing.gfgLink?.trim()) parts.push(`GFG link: ${existing.gfgLink.trim()}`);
  if (existing.youtubeLink?.trim()) parts.push(`YouTube link: ${existing.youtubeLink.trim()}`);
  if (existing.links?.length) {
    parts.push(
      'Links: ' +
        existing.links
          .filter((l) => l.url?.trim())
          .map((l) => `${l.label || 'Resource'}: ${l.url}`)
          .join('; ')
    );
  }
  return parts.length ? parts.join('\n') : '';
}

export async function generateQuestionData(
  topicName: string,
  options?: {
    hint?: string;
    trackId?: string;
    userMessageOverride?: string;
    systemPrompt?: string;
    existingQuestion?: ExistingQuestionData;
  }
): Promise<GeneratedQuestionData> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenAI is not configured. Add VITE_OPENAI_API_KEY to your .env file.');
  }

  const trackId = options?.trackId ?? 'dsa';
  const hint = options?.hint;
  const systemPrompt = options?.systemPrompt?.trim() || getSystemPrompt(trackId);

  let defaultMessage: string;
  const existingBlock = options?.existingQuestion && buildExistingQuestionBlock(options.existingQuestion);
  if (existingBlock) {
    defaultMessage =
      `Topic: ${topicName}. The user is editing an existing question. Below is the current data. Please update or improve it and return the full JSON in the same shape (title, description, explanation, difficulty, leetcodeLink, gfgLink, youtubeLink, links). Keep or refine the content as appropriate.\n\nCurrent question data:\n${existingBlock}`;
  } else {
    defaultMessage = hint?.trim()
      ? `Topic: ${topicName}. Question hint or title: ${hint}. Generate one question.`
      : `Topic: ${topicName}. Generate one practice question for this topic.`;
  }

  const userMessage = options?.userMessageOverride?.trim() || defaultMessage;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    }),
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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OpenAI returned invalid JSON');
  }

  return {
    title: typeof parsed.title === 'string' ? parsed.title : '',
    description: typeof parsed.description === 'string' ? parsed.description : '',
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
    difficulty:
      parsed.difficulty === 'easy' || parsed.difficulty === 'medium' || parsed.difficulty === 'hard'
        ? parsed.difficulty
        : '',
    leetcodeLink: typeof parsed.leetcodeLink === 'string' ? parsed.leetcodeLink : '',
    gfgLink: typeof parsed.gfgLink === 'string' ? parsed.gfgLink : '',
    youtubeLink: typeof parsed.youtubeLink === 'string' ? parsed.youtubeLink : '',
    links: Array.isArray(parsed.links)
      ? (parsed.links as { label?: string; url?: string }[])
          .filter((l) => l && typeof l.url === 'string' && l.url.trim() !== '')
          .map((l) => ({ label: typeof l.label === 'string' ? l.label : 'Resource', url: String(l.url).trim() }))
      : undefined,
  };
}
