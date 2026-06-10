import { resolveAssetUrl } from "@/lib/url";

function buildFallbackAvatarSvg() {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="프로필 아바타">
    <circle cx="60" cy="60" r="60" fill="#e5e7eb"/>
    <circle cx="60" cy="45" r="20" fill="#94a3b8"/>
    <path d="M24 102c6-18 20-30 36-30s30 12 36 30" fill="#94a3b8"/>
  </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getAvatarSrc(url?: string | null, _name?: string | null) {
  return resolveAssetUrl(url) || buildFallbackAvatarSvg();
}
