import { resolveAssetUrl } from "@/lib/url";

const DEFAULT_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="기본 프로필 이미지">
  <rect width="100" height="100" rx="22" fill="#F3F4F6"/>
  <circle cx="50" cy="38" r="15" fill="#CBD5E1"/>
  <path d="M25 82c5-14 17-22 25-22s20 8 25 22" fill="#CBD5E1"/>
</svg>
`.trim();

export const DEFAULT_AVATAR_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`;

export function getAvatarSrc(url?: string | null) {
  return resolveAssetUrl(url) || DEFAULT_AVATAR_DATA_URL;
}
