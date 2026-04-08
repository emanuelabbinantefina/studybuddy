export const AVATAR_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, 
  OUTPUT_SIZE: 256,
  OUTPUT_QUALITY: 0.86,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  FALLBACK_BG_COLOR: '4f6bff',
  FALLBACK_TEXT_COLOR: 'fff',
};

export const PROFILE_CONFIG = {
  MAX_BIO_LENGTH: 120,
  MAX_USERNAME_LENGTH: 30,
  STREAK_CACHE_MINUTES: 5,
};

export function generateAvatarUrl(firstName: string, lastName: string): string {
  const initials = getInitials(firstName, lastName);
  const encoded = encodeURIComponent(initials);
  return `https://ui-avatars.com/api/?name=${encoded}&background=${AVATAR_CONFIG.FALLBACK_BG_COLOR}&color=${AVATAR_CONFIG.FALLBACK_TEXT_COLOR}&size=128&bold=true`;
}

function getInitials(firstName: string, lastName: string): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  
  if (!first && !last) return 'U'; 
  
  const firstInitial = first.charAt(0).toUpperCase();
  const lastInitial = last.charAt(0).toUpperCase();
  
  if (!last) return firstInitial;
  if (!first) return lastInitial;
  
  return firstInitial + lastInitial;
}