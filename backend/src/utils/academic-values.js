// valori inseriti dagli utenti durante il testing che non rappresentano materie reali;
// vanno esclusi prima di salvare o mostrare i suggerimenti nel catalogo
const PLACEHOLDER_SUBJECTS = new Set([
  'a',
  'aa',
  'aaa',
  'asd',
  'asd asd',
  'demo',
  'placeholder',
  'prova',
  'sample',
  'test',
  'test test',
]);

function normalizeAcademicValue(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isMeaningfulSubjectValue(value) {
  const normalized = normalizeAcademicValue(value);
  if (!normalized) return false;

  const lowered = normalized.toLowerCase();
  // le materie universitarie hanno sempre un nome di almeno 3 caratteri
  if (normalized.length < 3) return false;
  // esclude i placeholder noti inseriti durante il testing
  if (PLACEHOLDER_SUBJECTS.has(lowered)) return false;
  // esclude sigle di 1-2 lettere (es. "A", "LP") che non sono nomi di materie validi
  if (/^[a-z]{1,2}$/i.test(normalized)) return false;

  return true;
}

module.exports = {
  isMeaningfulSubjectValue,
  normalizeAcademicValue,
};
