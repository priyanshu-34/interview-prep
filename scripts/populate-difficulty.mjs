/**
 * Fetches LeetCode problem difficulties and updates questions.json.
 * Run from repo root: node scripts/populate-difficulty.mjs
 * Extracts slug from each question's leetcodeLink and sets difficulty from LeetCode API.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const questionsPath = join(root, 'src', 'data', 'questions.json');

const DIFF = { 1: 'easy', 2: 'medium', 3: 'hard' };

function slugFromLeetcodeUrl(url) {
  if (!url || !url.includes('leetcode.com/problems/')) return null;
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\/problems\/([^/]+)/);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

async function fetchLeetcodeDifficulties() {
  const res = await fetch('https://leetcode.com/api/problems/all/');
  if (!res.ok) throw new Error(`LeetCode API failed: ${res.status}`);
  const data = await res.json();
  const map = new Map();
  for (const p of data.stat_status_pairs || []) {
    const slug = p.stat?.question__title_slug;
    const level = p.difficulty?.level;
    if (slug && level && DIFF[level]) map.set(slug, DIFF[level]);
  }
  return map;
}

async function main() {
  const slugToDiff = await fetchLeetcodeDifficulties();
  console.log('Fetched', slugToDiff.size, 'LeetCode difficulties');

  const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'));
  let updated = 0;
  for (const q of questions) {
    const slug = slugFromLeetcodeUrl(q.leetcodeLink);
    if (slug && slugToDiff.has(slug)) {
      const d = slugToDiff.get(slug);
      if (q.difficulty !== d) {
        q.difficulty = d;
        updated++;
      }
    }
  }
  writeFileSync(questionsPath, JSON.stringify(questions, null, 2));
  console.log('Updated', updated, 'questions with difficulty. Total questions:', questions.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
