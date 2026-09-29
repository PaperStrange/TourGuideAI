#!/usr/bin/env node
/**
 * html2txt.mjs — deterministic HTML -> text reduction, for *reading* a fetched
 * source page offline. It is a curation aid, not a fact source: the .html bytes
 * next to it are the evidence.
 *
 * The reduction is intentionally crude and repeatable:
 *   script/style/noscript/svg/comments dropped, block tags -> newline,
 *   entities decoded, whitespace collapsed, blank lines squeezed.
 *
 * Usage: node html2txt.mjs <in.html> [out.txt]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  yen: '¥', mdash: '—', ndash: '–', hellip: '…', middot: '·',
  times: '×', deg: '°', copy: '©', reg: '®', laquo: '«', raquo: '»',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (ENT[n] !== undefined ? ENT[n] : m));
}

export function htmlToText(html) {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|table|ul|ol|dl|dt|dd|td|th|blockquote|form|nav|main|aside|figure|figcaption)>/gi, '\n');
  s = s.replace(/<(p|div|li|tr|h[1-6]|section|article|table|ul|ol|dl|dt|dd|td|th|blockquote|form|nav|main|aside|figure|figcaption)\b[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  s = s.replace(/[ \t\u00a0\u3000]+/g, ' ');
  s = s.replace(/ *\n */g, '\n');
  s = s.replace(/\n{2,}/g, '\n');
  return s.trim() + '\n';
}

const [, , inPath, outPath] = process.argv;
if (!inPath) {
  console.error('usage: node html2txt.mjs <in.html> [out.txt]');
  process.exit(2);
}
const text = htmlToText(readFileSync(inPath, 'utf8'));
const out = outPath ?? inPath.replace(/\.html?$/i, '') + '.txt';
writeFileSync(out, text, 'utf8');
console.log(`${basename(inPath)} -> ${basename(out)}  ${text.length} chars`);
