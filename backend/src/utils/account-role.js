// ruoli che sbloccano funzionalità premium (usato per proteggere le route BuddyPro)
const SPECIAL_ACCOUNT_ROLES = new Set([
  'buddypro',
]);

function normalizeAccountRole(value, fallback = 'standard') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'standard') return 'standard';
  // 'special' era il nome del ruolo nei token JWT emessi prima della rinomina in 'buddypro'
  if (raw === 'special') return 'buddypro';
  if (SPECIAL_ACCOUNT_ROLES.has(raw)) return raw;
  return fallback;
}

function isSpecialAccountRole(value) {
  return SPECIAL_ACCOUNT_ROLES.has(normalizeAccountRole(value));
}

// restituisce accountRole e il flag isSpecialUser usato dai middleware per proteggere le route premium
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
