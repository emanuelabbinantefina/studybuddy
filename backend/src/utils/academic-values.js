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
  if (normalized.length < 3) return false;
  if (PLACEHOLDER_SUBJECTS.has(lowered)) return false;
  if (/^[a-z]{1,2}$/i.test(normalized)) return false;

  return true;
}

module.exports = {
  isMeaningfulSubjectValue,
  normalizeAcademicValue,
};
