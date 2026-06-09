import { getAvatarSrc } from "@/lib/avatar";
import type { Document } from "@/types/document";

type AvatarLike = {
  avatarUrl?: string | null;
  avatar?: string | null;
  imageUrl?: string | null;
};

type DocumentAuthorAvatarSource = Document & {
  ownerAvatar?: string | null;
  avatarUrl?: string | null;
  owner?: AvatarLike | null;
  author?: AvatarLike | null;
  ownerProfile?: AvatarLike | null;
};

export function getDocumentAuthorAvatarSrc(document: DocumentAuthorAvatarSource) {
  const avatarUrl =
    document.ownerAvatarUrl ??
    document.ownerAvatar ??
    document.avatarUrl ??
    document.owner?.avatarUrl ??
    document.owner?.avatar ??
    document.owner?.imageUrl ??
    document.author?.avatarUrl ??
    document.author?.avatar ??
    document.author?.imageUrl ??
    document.ownerProfile?.avatarUrl ??
    null;

  return getAvatarSrc(avatarUrl);
}
