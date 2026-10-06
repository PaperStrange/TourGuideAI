import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ending = '最后一句：记住晚风与街灯。';
export const SELECTED_NOTE = ('<b data-personal-note>晚风 & "灯光"</b>\n' + '沿着京都街道慢慢走，记下窗边的光与自己的旅程。'.repeat(30)).slice(0, 500 - ending.length) + ending;
export const UNSELECTED_NOTE = 'PRIVATE_UNSELECTED：这段笔记没有选择分享。';
export const UNSAVED_DRAFT = 'UNSAVED_DRAFT：尚未保存，不得分享。';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const stable = value => JSON.stringify({ x: value.game.x, y: value.game.y,
  visits: value.game.visitedIds, choices: value.game.choiceIds, read: value.game.readSourceIds, notes: value.notes });
const decode = url => JSON.parse(Buffer.from(new URL(url).hash.slice('#recap='.length), 'base64url').toString('utf8'));

// Same helper runs from the completed real walkthrough or a clearly labelled
// saved-journey smoke. Only the native OS handoff is stubbed; clipboard, downloads,
// fresh recipient documents, image decode and browser PDF generation are real.
export async function verifySharing({ main, scenario, saved, check, capture, report,
  output, origin, timeout, persist, includeDraftCheck }) {
  const { page, context } = main;
  const before = await saved(page);
  await page.locator('#export-notes').click();
  await page.waitForFunction(() => document.querySelector('#share-dialog')?.open);
  check('share-preview-excludes-personal-notes-by-default', await page.locator('#share-preview .recap-note').count() === 0
    && await page.locator('[data-share-note]:checked').count() === 0);
  if (includeDraftCheck) check('unsaved-note-draft-is-not-a-share-option', await page.locator('[data-share-note="mufg"]').count() === 0
    && !(await page.locator('#share-preview').innerText()).includes(UNSAVED_DRAFT));
  await page.locator('[data-share-note="crossing"]').check();
  await page.locator('#share-dialog [data-locale="en"]').click();
  check('share-locale-preserves-note-selection-and-focus', await page.locator('[data-share-note="crossing"]').isChecked()
    && await page.evaluate(() => document.activeElement?.dataset.locale === 'en' && Boolean(document.activeElement.closest('#share-dialog'))));
  await capture(page, 'share-preview-en');
  await page.evaluate(() => { window.__QA_IMAGE_TEXT__ = []; });
  await page.locator('#share-dialog [data-locale="zh"]').click();
  await page.waitForFunction(() => !document.querySelector('#share-image').disabled, null, { timeout });
  const preview = await page.locator('#share-preview').evaluate(element => ({
    html: element.innerHTML, text: element.innerText, note: element.querySelector('.recap-note p')?.textContent,
    injected: Boolean(element.querySelector('[data-personal-note]')),
    kinds: [...element.querySelectorAll('.recap-stop > small')].map(node => node.textContent),
  }));
  check('share-preview-keeps-selected-saved-text-and-route-meaning', preview.note === SELECTED_NOTE && !preview.injected
    && !preview.text.includes(UNSELECTED_NOTE) && !preview.text.includes(UNSAVED_DRAFT)
    && preview.kinds.length === 3 && preview.kinds[0] !== preview.kinds[1] && preview.kinds[1] === preview.kinds[2], preview);
  await capture(page, 'share-preview-zh');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await page.locator('#share-copy').click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const recap = decode(copied);
  check('copied-link-contains-only-the-previewed-snapshot', new URL(copied).pathname === '/journey.html'
    && recap.lang === 'zh' && recap.stops.length === 3 && recap.stops[0].note === SELECTED_NOTE
    && recap.stops[1].choice === 'street-only' && recap.stops[2].choice === 'no-cash-stop'
    && recap.stops.slice(1).every(stop => !Object.hasOwn(stop, 'note')), recap);
  report.observations.sharedRecap = recap;
  writeFileSync(join(output, 'shared-recap-url.txt'), copied + '\n'); persist();

  const recipient = await scenario('fresh-recipient-link', {}, { viewport: { width: 390, height: 844 } }, false,
    { entryUrl: copied, staticEntry: true });
  await recipient.page.waitForSelector('#recap-content .recap');
  const received = await recipient.page.locator('#recap-content').innerHTML();
  check('fresh-recipient-matches-exact-preview-without-author-state', received === preview.html);
  const recipientState = await recipient.page.evaluate(() => ({ ...window.__QA_ENTRY__, storageKeys: Object.keys(localStorage),
    width: document.documentElement.scrollWidth, editors: document.querySelectorAll('textarea,input:not([type=button])').length }));
  check('recipient-needs-no-webgl-storage-write-or-editor', recipientState.webglContexts === 0 && !recipientState.storageWrites.length
    && !recipientState.storageKeys.length && !recipientState.editors && !recipient.record.requests.some(path => path.endsWith('.glb')), recipientState);
  check('recipient-long-chinese-note-fits-phone-width', recipientState.width <= 390);
  await capture(recipient.page, 'shared-recipient-zh-mobile');
  await recipient.page.locator('[data-recap-locale="en"]').click();
  check('recipient-language-change-preserves-personal-text-and-focus', await recipient.page.locator('.recap-note p').textContent() === SELECTED_NOTE
    && await recipient.page.evaluate(() => document.documentElement.lang === 'en' && document.activeElement?.dataset.recapLocale === 'en'));
  await capture(recipient.page, 'shared-recipient-en-mobile');
  await recipient.page.locator('[data-recap-locale="zh"]').click();

  const downloadEvent = page.waitForEvent('download'); await page.locator('#share-image').click();
  const download = await downloadEvent, pngPath = join(output, 'shared-recap-zh.png'); await download.saveAs(pngPath);
  const png = readFileSync(pngPath);
  const imageText = await page.evaluate(() => window.__QA_IMAGE_TEXT__);
  const drawn = imageText.map(line => line.text).join('');
  const imageSize = await page.evaluate(async bytes => {
    const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    const result = { width: image.width, height: image.height }; image.close(); return result;
  }, [...png]);
  check('png-is-decodable-and-draws-the-whole-selected-note', png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && imageSize.width === png.readUInt32BE(16) && imageSize.height === png.readUInt32BE(20)
    && drawn.includes(SELECTED_NOTE.replaceAll('\n', '')) && drawn.includes(ending)
    && !drawn.includes(UNSELECTED_NOTE) && !drawn.includes(UNSAVED_DRAFT)
    && imageText.every(line => line.y >= 0 && line.y < imageSize.height), { ...imageSize, bytes: png.length, drawCalls: imageText.length, method: 'Observed actual Canvas2D fillText plus decoded downloaded PNG; independent image review remains separate.' });
  (report.outputs ??= []).push({ name: 'shared-recap-zh.png', path: pngPath, sha256: sha(png) }); persist();

  const printEvent = page.waitForEvent('popup'); await page.locator('#share-print').click();
  const printPage = await printEvent; await printPage.waitForSelector('#recap-content .recap');
  check('print-reader-matches-the-previewed-selection', await printPage.locator('#recap-content').innerHTML() === preview.html);
  await printPage.evaluate(() => {
    window.__QA_PRINT__ = null;
    window.print = () => {
      window.dispatchEvent(new Event('beforeprint'));
      const opened = [...document.querySelectorAll('.recap details')].every(node => node.open);
      window.dispatchEvent(new Event('afterprint'));
      window.__QA_PRINT__ = { opened, restored: [...document.querySelectorAll('.recap details')].every(node => !node.open) };
    };
  });
  await printPage.locator('#recap-print').click();
  const printEvents = await printPage.evaluate(() => window.__QA_PRINT__);
  check('print-action-opens-sources-and-restores-reading-state', printEvents?.opened && printEvents?.restored, { ...printEvents, method: 'Injected print lifecycle; actual Chromium PDF generated separately.' });
  await printPage.emulateMedia({ media: 'print' });
  await printPage.setViewportSize({ width: 850, height: 1100 });
  const pdfPath = join(output, 'shared-recap-zh.pdf'); await printPage.pdf({ path: pdfPath, format: 'A4', printBackground: true });
  const pdf = readFileSync(pdfPath);
  check('browser-pdf-output-and-print-layout-are-valid', pdf.subarray(0, 5).toString() === '%PDF-'
    && await printPage.locator('.recap-note p').textContent() === SELECTED_NOTE
    && await printPage.locator('.reader-actions').evaluate(node => getComputedStyle(node).display === 'none'), { bytes: pdf.length });
  await capture(printPage, 'shared-recipient-print'); await printPage.close();
  report.outputs.push({ name: 'shared-recap-zh.pdf', path: pdfPath, sha256: sha(pdf) }); persist();

  await page.bringToFront();
  await page.locator('#share-native').click();
  const handed = await page.evaluate(() => window.__QA_NATIVE_CALLS__.at(-1));
  check('native-link-handoff-uses-the-previewed-link', handed?.url === copied, { ...handed, method: 'Observed navigator.share stub; no OS delivery claim.' });
  const beforeCancel = await page.locator('#share-preview').innerHTML();
  await page.evaluate(() => { window.__QA_NATIVE_ABORT__ = true; });
  await page.locator('#share-native').click();
  await page.waitForFunction(() => document.querySelector('#share-status')?.textContent);
  check('native-share-cancel-retains-selection-preview-and-save', await page.locator('[data-share-note="crossing"]').isChecked()
    && await page.locator('#share-preview').innerHTML() === beforeCancel && stable(await saved(page)) === stable(before), await page.locator('#share-status').innerText());
  await page.evaluate(() => { window.__QA_NATIVE_ABORT__ = false; });
  await page.locator('#share-native-image').click();
  const imageHandoff = await page.evaluate(() => window.__QA_NATIVE_CALLS__.at(-1));
  check('native-image-handoff-uses-the-generated-png', imageHandoff?.files?.[0]?.type === 'image/png' && imageHandoff.files[0].size === png.length, imageHandoff);
  await page.locator('#share-close').click();
  check('closing-share-restores-walk-state-and-focus', stable(await saved(page)) === stable(before)
    && await page.evaluate(() => !document.querySelector('#share-dialog').open && document.activeElement?.id === 'export-notes'));
  await page.evaluate(() => { delete navigator.share; delete navigator.canShare; });
  await page.locator('#export-notes').click();
  await page.waitForFunction(() => !document.querySelector('#share-image').disabled, null, { timeout });
  check('without-native-sharing-copy-and-image-remain-available', await page.locator('#share-native').isDisabled()
    && await page.locator('#share-copy').isEnabled() && await page.locator('#share-image').isEnabled()
    && await page.locator('#share-preview .recap-note').count() === 0);
  await page.locator('#share-close').click();

  for (const [label, fragment] of [
    ['malformed', '#recap=not-valid-json'],
    ['unsupported', '#recap=' + Buffer.from(JSON.stringify({ ...recap, v: 99 })).toString('base64url')],
    ['oversized', '#recap=' + 'x'.repeat(8193)],
  ]) {
    await recipient.page.goto(origin + '/journey.html' + fragment);
    await recipient.page.waitForSelector('#recap-error');
    const errorEn = await recipient.page.locator('#recap-error').innerText();
    await recipient.page.locator('[data-recap-locale="zh"]').click();
    check(`recipient-${label}-link-has-localized-error-without-partial-recap`, Boolean(errorEn)
      && /[\u3400-\u9fff]/.test(await recipient.page.locator('#recap-error').innerText())
      && await recipient.page.locator('#recap-content').count() === 0);
    await recipient.page.locator('[data-recap-locale="en"]').click();
  }
  check('recipient-has-no-external-requests-or-browser-errors', !recipient.record.externalRequests.length && !recipient.record.pageErrors.length && !recipient.record.consoleErrors.length, recipient.record);
  await recipient.context.close();
}
