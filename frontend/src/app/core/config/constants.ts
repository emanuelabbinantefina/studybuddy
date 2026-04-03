export const AVATAR_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  FALLBACK_BG_COLOR: '4f6bff',
  FALLBACK_TEXT_COLOR: 'fff',
};

export const PROFILE_CONFIG = {
  MAX_BIO_LENGTH: 120,
  MAX_USERNAME_LENGTH: 30,
  STREAK_CACHE_MINUTES: 5,
};

export function generateAvatarUrl(name: string): string {
  const safeName = encodeURIComponent(name.trim() || 'User');
  return `https://ui-avatars.com/api/?name=${safeName}&background=${AVATAR_CONFIG.FALLBACK_BG_COLOR}&color=${AVATAR_CONFIG.FALLBACK_TEXT_COLOR}&size=128&bold=true`;
}