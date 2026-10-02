import type { Types } from 'mongoose';

export const PRIVACY_LEVELS = ['public', 'followers', 'private'] as const;
export type Privacy = (typeof PRIVACY_LEVELS)[number];

interface Viewer {
  _id: Types.ObjectId;
}

interface Owner {
  _id: Types.ObjectId;
  followers?: Types.ObjectId[];
}

/**
 * Whether `viewer` (undefined = logged out) may see something `owner` set to `privacy`.
 * Owner sees everything; followers see public + followers; everyone else sees public.
 */
export function canViewAtLevel(privacy: Privacy, viewer: Viewer | undefined, owner: Owner): boolean {
  if (viewer && viewer._id.equals(owner._id)) return true;
  if (privacy === 'public') return true;
  if (privacy === 'followers') return !!viewer && !!owner.followers?.some((id) => id.equals(viewer._id));
  return false;
}

// TODO (2a): effectivePrivacy, canView(viewer, item, trip), visibilityFilter
