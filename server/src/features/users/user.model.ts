import { Schema, model, type Types } from 'mongoose';
import { PRIVACY_LEVELS, type Privacy } from '../../utils/privacy.js';

export const COUNTRY_STATUSES = ['visited', 'lived', 'want'] as const;
export type CountryStatus = (typeof COUNTRY_STATUSES)[number];

export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export interface Image {
  url: string;
  cloudinaryId: string;
}

export interface VisitedCountry {
  code: string; // ADM0_A3
  status: CountryStatus;
  addedAt: Date;
}

export interface VisitedCity {
  _id: Types.ObjectId;
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
  addedAt: Date;
}

export interface IUser {
  username: string;
  email: string;
  passwordHash: string;
  avatar?: Image;
  bio: string;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  mapPrivacy: Privacy;
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<Image>(
  {
    url: { type: String, required: true },
    cloudinaryId: { type: String, required: true },
  },
  { _id: false },
);

const visitedCountrySchema = new Schema<VisitedCountry>(
  {
    code: { type: String, required: true, uppercase: true, trim: true }, // ADM0_A3
    status: { type: String, enum: COUNTRY_STATUSES, default: 'visited' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Keeps its _id: DELETE /api/map/cities/:cityId uses it
const visitedCitySchema = new Schema<VisitedCity>({
  name: { type: String, required: true, trim: true },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  countryCode: { type: String, required: true, uppercase: true, trim: true },
  addedAt: { type: Date, default: Date.now },
});

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: USERNAME_PATTERN,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: imageSchema, default: undefined },
    bio: { type: String, default: '', trim: true, maxlength: 280 },
    visitedCountries: { type: [visitedCountrySchema], default: [] },
    visitedCities: { type: [visitedCitySchema], default: [] },
    mapPrivacy: { type: String, enum: PRIVACY_LEVELS, default: 'public' },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // Incrementing this invalidates every refresh token issued for the user
    tokenVersion: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        Reflect.deleteProperty(ret, 'passwordHash');
        Reflect.deleteProperty(ret, 'tokenVersion');
        return ret;
      },
    },
  },
);

/** Safe-to-send user shape — what requireAuth attaches as req.user. */
export type AuthUser = Omit<IUser, 'passwordHash' | 'tokenVersion'> & { _id: Types.ObjectId };

export const User = model<IUser>('User', userSchema);
