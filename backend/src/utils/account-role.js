const SPECIAL_ACCOUNT_ROLES = new Set([
  'buddypro',
]);

function normalizeAccountRole(value, fallback = 'standard') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'standard') return 'standard';
  if (raw === 'special') return 'buddypro';
  if (SPECIAL_ACCOUNT_ROLES.has(raw)) return raw;
  return fallback;
}

function isSpecialAccountRole(value) {
  return SPECIAL_ACCOUNT_ROLES.has(normalizeAccountRole(value));
}

function buildAccountAccess(value) {
  const accountRole = normalizeAccountRole(value);
  return {
    accountRole,
    isSpecialUser: isSpecialAccountRole(accountRole),
  };
}

module.exports = {
  SPECIAL_ACCOUNT_ROLES,
  normalizeAccountRole,
  isSpecialAccountRole,
  buildAccountAccess,
};
