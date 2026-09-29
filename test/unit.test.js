'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../src/renderer/js/calc');
const { validateName, uniqueName, matchScore, categoryOf, isHiddenName } = require('../src/shared/files-common');

test('Rechner: Grundrechenarten und Vorrang', () => {
  assert.equal(calculate('12*7'), 84);
  assert.equal(calculate('2+3*4'), 14);
  assert.equal(calculate('(2+3)*4'), 20);
  assert.equal(calculate('2^10'), 1024);
  assert.equal(calculate('10/4'), 2.5);
  assert.equal(calculate('1,5 + 1,5'), 3);
  assert.equal(calculate('3 x 4'), 12);
  assert.equal(calculate('200*19%'), 38);
  assert.equal(calculate('-5+2'), -3);
  assert.equal(calculate('0.1+0.2'), 0.3);
});

test('Rechner: normale Suchbegriffe sind keine Rechnung', () => {
  assert.equal(calculate('word'), null);
  assert.equal(calculate('2024'), null);
  assert.equal(calculate('C:\\Users'), null);
  assert.equal(calculate('etsy-shop'), null);
  assert.equal(calculate('1/0'), null);
  assert.equal(calculate('(1+2'), null);
  assert.equal(calculate('alert(1)+1'), null);
});

test('Dateinamen prüfen', () => {
  assert.equal(validateName('Bericht.pdf'), null);
  assert.ok(validateName(''));
  assert.ok(validateName('a/b'));
  assert.ok(validateName('frage?'));
  assert.ok(validateName('CON'));
  assert.ok(validateName('nul.txt'));
  assert.ok(validateName('endet mit punkt.'));
});

test('Eindeutige Namen', () => {
  const taken = new Set(['Neuer Ordner', 'Neuer Ordner (2)', 'Bericht.pdf']);
  const exists = (n) => taken.has(n);
  assert.equal(uniqueName('Neuer Ordner', exists, true), 'Neuer Ordner (3)');
  assert.equal(uniqueName('Bericht.pdf', exists), 'Bericht (2).pdf');
  assert.equal(uniqueName('Frei.txt', exists), 'Frei.txt');
  assert.equal(uniqueName('Ordner.v2', (n) => n === 'Ordner.v2', true), 'Ordner.v2 (2)');
});

test('Suchbewertung', () => {
  assert.ok(matchScore('Rechnung_September.pdf', 'rech') > matchScore('Vorrechnung.pdf', 'rech'));
  assert.ok(matchScore('Visual Studio Code', 'vsc') > 0);
  assert.equal(matchScore('Word', 'excel'), 0);
  assert.ok(matchScore('Etsy Statistik Q3.pdf', 'etsy q3') > 0);
  assert.equal(matchScore('Etsy Statistik.pdf', 'etsy q3'), 0);
});

test('Dateitypen', () => {
  assert.equal(categoryOf('Foto.JPG'), 'bilder');
  assert.equal(categoryOf('Film.mkv'), 'videos');
  assert.equal(categoryOf('Brief.docx'), 'dokumente');
  assert.equal(categoryOf('setup.exe'), 'programme');
  assert.equal(categoryOf('ohne-endung'), 'sonstiges');
  assert.ok(isHiddenName('desktop.ini'));
  assert.ok(isHiddenName('~$Bericht.docx'));
  assert.ok(!isHiddenName('Bericht.docx'));
});
