import type { Types } from 'mongoose';
import { HttpError } from '../../middleware/errorMiddleware.js';
import { canViewAtLevel } from '../../utils/privacy.js';
import { User, type AuthUser, type VisitedCountry } from '../users/user.model.js';
import type { UpsertCountryInput } from './map.schemas.js';

export async function getMap(userId: string, viewer: AuthUser | undefined) {
  const owner = await User.findById(userId)
    .select('username mapPrivacy followers visitedCountries visitedCities')
    .lean();
  if (!owner) throw new HttpError(404, 'User not found');

  if (!canViewAtLevel(owner.mapPrivacy, viewer, owner)) {
    throw new HttpError(403, 'This map is private', { code: 'MAP_PRIVATE' });
  }

  return {
    userId: owner._id,
    username: owner.username,
    visitedCountries: owner.visitedCountries,
    visitedCities: owner.visitedCities,
  };
}

/** Adds the country, or changes its status if already on the map. */
export async function upsertCountry(userId: Types.ObjectId, { code, status }: UpsertCountryInput): Promise<VisitedCountry> {
  // Atomic steps so concurrent taps can't create duplicates: update in place if present,
  // otherwise push only if still absent. Each step returns just this country (one round trip).
  const options = { returnDocument: 'after', projection: { visitedCountries: { $elemMatch: { code } } } } as const;
  const setStatus = () =>
    User.findOneAndUpdate(
      { _id: userId, 'visitedCountries.code': code },
      { $set: { 'visitedCountries.$.status': status } },
      options,
    ).lean();

  const user =
    (await setStatus()) ??
    (await User.findOneAndUpdate(
      { _id: userId, 'visitedCountries.code': { $ne: code } },
      { $push: { visitedCountries: { code, status, addedAt: new Date() } } },
      options,
    ).lean()) ??
    // Another request added it between the two steps
    (await setStatus());

  const country = user?.visitedCountries[0];
  if (!country) throw new HttpError(404, 'User not found');
  return country;
}

export async function removeCountry(userId: Types.ObjectId, code: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $pull: { visitedCountries: { code } } });
}
