import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseSrt, readSrtFile } from '../lib/srt.ts';

const sample = '\uFEFF1\r\n00:00:01,200 --> 00:00:03.450\r\nHello 世界\r\nSecond line\r\n \r\n8\r\n00:01:02,1 --> 00:01:03,22\r\nNext';
const expected = [['00:00:01.200', '00:00:03.450', 'Hello 世界\nSecond line'], ['00:01:02.100', '00:01:03.220', 'Next']];
test('paste parses BOM, CRLF, multiline, mixed milliseconds and nonsequential numbers', () => {
  assert.deepEqual(parseSrt(sample), expected);
  assert.deepEqual(parseSrt(sample.replaceAll('\r\n', '\n')), expected);
});
test('UTF-8 file import uses the same editor rows', async () => {
  assert.deepEqual(await readSrtFile(new File([sample], 'captions.SRT')), expected);
  await assert.rejects(readSrtFile(new File([sample], 'media.mp4')), /Choose an .srt/);
  await assert.rejects(readSrtFile(new File([new Uint8Array([0xff])], 'bad.srt')), /UTF-8/);
});
test('malformed paste and file import reject the entire input', async () => {
  for (const [input, error] of [
    ['', /empty/], ['hello', /numeric cue/], ['1\nno timing\nhello', /timing line/],
    ['1\n00:60:00,000 --> 00:61:00,000\nhello', /invalid timestamp/],
    ['1\n00:00:03,000 --> 00:00:02,000\nhello', /end time/],
    ['1\n00:00:01,000 --> 00:00:02,000', /text is missing/],
    [sample + '\n\ninvalid cue', /Cue 3/]
  ]) {
    assert.throws(() => parseSrt(input), error);
    await assert.rejects(readSrtFile(new File([input], 'bad.srt')), error);
  }
});
test('local import UI wires both paths without backend or quota calls', () => {
  const modal = readFileSync('components/modals/import-srt-modal.tsx', 'utf8');
  assert.match(modal, /load\(await readSrtFile\(file\)\)/);
  assert.match(modal, /load\(parseSrt\(text\)\)/);
  assert.match(modal, /role="alert"/);
  assert.match(modal, /<label[\s\S]*UTF-8 SRT file/);
  assert.match(modal, /<label[\s\S]*Paste SRT text/);
  assert.doesNotMatch(modal, /\bapi\.|fetch\(|transcribe\(/);
  const editor = readFileSync('components/sections/editor-client.tsx', 'utf8');
  assert.equal((editor.match(/<ImportSrtModal onImport={importSrt} disabled={isTranscribing}/g) ?? []).length, 2);
  const handler = editor.slice(editor.indexOf('  function importSrt('), editor.indexOf('  function openFilePicker('));
  assert.match(handler, /setRows\(importedRows\)/);
  assert.match(handler, /setOrderEdits\(\{\}\)/);
  assert.doesNotMatch(handler, /\bapi\.|transcribe|setMediaUrl|setFilename/);
});
test('demo and editor controls have meaningful names; guests have local labels', () => {
  const home = readFileSync('components/sections/home-sections.tsx', 'utf8');
  assert.match(home, /type="button" aria-label={tool} title={tool}/);
  assert.match(home, /aria-label="Play editor demo"/);
  const editor = readFileSync('components/sections/editor-client.tsx', 'utf8');
  assert.match(editor, /aria-label={playing \? "Pause media" : "Play media"}/);
  assert.match(editor, /aria-label={`Select subtitle row/);
  assert.match(editor, /<button[\s\S]*aria-label="Move subtitle position"/);
  assert.match(editor, /onKeyDown={[\s\S]*ArrowLeft/);
  for (const path of ['components/sections/editor-client.tsx', 'components/modals/export-modal.tsx']) {
    assert.match(readFileSync(path, 'utf8'), /user \? getVipLabel\(vipPlan\) : "Guest"/);
  }
  assert.match(readFileSync('components/modals/export-modal.tsx', 'utf8'), /user \? "Current membership" : "Local mode"/);
});
test('all active pages, metadata and copy remain PayPal-only', () => {
  function check(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) check(path);
      else if (/\.(tsx?|json)$/.test(path)) assert.doesNotMatch(readFileSync(path, 'utf8'), /stripe/i, path);
    }
  }
  for (const directory of ['app', 'components', 'lib']) check(directory);
  for (const path of ['components/sections/home-sections.tsx', 'components/sections/pricing-client.tsx', 'app/privacy-policy/page.tsx', 'app/terms-of-service/page.tsx']) {
    assert.match(readFileSync(path, 'utf8'), /PayPal/);
  }
});
