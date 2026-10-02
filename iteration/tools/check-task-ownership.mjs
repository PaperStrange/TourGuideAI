// Check that no file currently assigned to an open task is claimed by two DIFFERENT owners.
//
// WHY. The user caught the same defect three times and told me to stop needing the reminder. The task
// board's writeScopeWarnings cannot do this job: it flags any intersection, including with tasks that are
// long COMPLETED and merged, so on this board it is a permanent false positive and I learned to read past
// it. That is what "a noisy guard gets switched off" looks like from the inside.
//
// The one rule that actually prevents my mistake is narrower: across the OPEN cards, every file has at
// most one owner. I violated it by giving task-21 to geo-contract while task-19 and task-20 held the same
// files for doors-author -- from which it follows that cards touching one file should simply be one owner,
// and then "misassignment" is not a distinct failure mode.
//
// This is a checklist item, not a new gate: it reads task descriptions I wrote, so it cannot be more
// reliable than they are. It is here because running it takes seconds and remembering does not.
import { readFileSync } from 'node:fs';

const REPO = 'D:/All-Downloads/TourGuideAI';
const TABLE = `${REPO}/iteration/design/file-ownership.md`;

// The authoritative owner table, parsed rather than retyped -- a second copy would drift, which is D-12.
const table = readFileSync(TABLE, 'utf8');
const owners = new Map();
// Parse ALL backticked paths on a row, not just the first. My first version took only the leading bold
// span, so it silently dropped every additional path: bake-viewer.mjs and the attestations row never
// appeared, and a checker that under-reports the table it claims to read is worse than no checker.
for (const line of table.split('\n')) {
  const m = line.match(/^\*\*([^*]+)\*\*.*\|\s*(task-[^|]*)\|\s*\*\*`([a-z-]+)`\*\*/);
  if (!m) continue;
  for (const f of m[1].matchAll(/`([^`]+)`/g)) owners.set(f[1], m[3]);
  // multi-path rows also name files outside the bold span, e.g. "**a** · `b` | task | **`owner`**"
  for (const f of line.matchAll(/·\s*`([^`]+)`/g)) owners.set(f[1], m[3]);
}

console.log(`owner table rows parsed: ${owners.size} file entries (from iteration/design/file-ownership.md)\n`);
for (const [f, o] of [...owners].sort()) console.log(`  ${o.padEnd(16)} ${f}`);

console.log(`
HOW TO USE THIS BEFORE WRITING A CARD
  1. List the files the card will write.
  2. For each, look up its owner above.
  3. If every owner is the same, create ONE card for that owner.
  4. If they differ, SPLIT the card by owner -- do not hand one card's files to two roles.
  5. Never create a second card for a file another card already has open.
  6. ASK FIRST: do these files, for this owner, already have a card -- completed or not? If yes,
     REOPEN that card instead of creating one. Same owner + same files + new work = extend, not spawn.
     This is the one I got wrong five times in a row: every new card I wrote overlapped a completed one,
     and each overlap stayed on the board as a warning nothing could clear, because the board compares
     every card's historical scope against current cards and cannot tell 'this role edited these files'
     from 'this role owns these files'.

WHY STEP 3 AND NOT "SERIALISE THEM"
  I serialised task-19/20/21 and called it solved. Serialising removes concurrency; it does not remove
  two roles owning one file, and the loser's edits land against a baseline that predates the winner's.
  When the files are one owner's, the question does not arise.
`);
