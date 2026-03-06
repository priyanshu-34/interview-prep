/**
 * Converts leet.js (ultimateData) to track-extensible JSON: tracks, topics, questions.
 * Run from repo root: node scripts/convert-leet.mjs
 * Reads from ../leet.js and writes to src/data/
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const leetPath = join(root, '..', 'leet.js');

// Load leet.js: define ultimateData and return it (strip export)
const raw = readFileSync(leetPath, 'utf-8');
const withoutExport = raw.replace(/\s*export\s+default\s+ultimateData\s*;\s*$/, '');
const fn = new Function(`${withoutExport} return ultimateData;`);
const ultimateData = fn();

const content = ultimateData.data.content;
const TRACK_ID = 'dsa';

const tracks = [{ id: TRACK_ID, name: 'DSA', order: 0 }];
const topics = [];
const questions = [];
let globalOrder = 0;

content.forEach((section, sectionIndex) => {
  const topicId = `topic_${sectionIndex}_${slug(section.contentHeading)}`;
  topics.push({
    id: topicId,
    trackId: TRACK_ID,
    name: section.contentHeading,
    order: sectionIndex,
  });

  (section.categoryList || []).forEach((cat) => {
    (cat.questionList || []).forEach((q, qIndex) => {
      const id = `dsa_${topicId}_${q.questionId || qIndex}`;
      questions.push({
        id,
        trackId: TRACK_ID,
        title: q.questionHeading || '',
        topicId,
        difficulty: null,
        gfgLink: q.gfgLink || '',
        leetcodeLink: q.leetCodeLink || '',
        youtubeLink: q.youTubeLink || '',
        order: globalOrder++,
      });
    });
  });
});

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, 'tracks.json'), JSON.stringify(tracks, null, 2));
writeFileSync(join(outDir, 'topics.json'), JSON.stringify(topics, null, 2));
writeFileSync(join(outDir, 'questions.json'), JSON.stringify(questions, null, 2));

console.log('Converted:', tracks.length, 'tracks,', topics.length, 'topics,', questions.length, 'questions');
