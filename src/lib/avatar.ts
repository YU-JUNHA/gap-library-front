import { resolveAssetUrl } from "@/lib/url";

const DEFAULT_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="기본 프로필 이미지">
  <rect width="100" height="100" rx="50" fill="#E2E8F0"/>
  <circle cx="50" cy="40" r="18" fill="#94A3B8"/>
  <path d="M18 86c4-18 19-28 32-28s28 10 32 28" fill="#94A3B8"/>
</svg>
`.trim();

export const DEFAULT_AVATAR_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`;

export function getAvatarSrc(url?: string | null) {
  return resolveAssetUrl(url) || DEFAULT_AVATAR_DATA_URL;
}
