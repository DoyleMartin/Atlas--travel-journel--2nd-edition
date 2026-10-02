import bcrypt from 'bcryptjs';
import { User } from '../users/user.model.js';
import { HttpError } from '../../middleware/errorMiddleware.js';
import { verifyRefresh } from '../../utils/generateToken.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

const BCRYPT_ROUNDS = 12;

// Compared against when the email doesn't exist, so "no such user" and "wrong password"
// take the same time and can't be told apart
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash('timing-equalizer', BCRYPT_ROUNDS));

export async function registerUser({ username, email, password }: RegisterInput) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // Duplicate username/email → Mongo 11000 → errorHandler responds 409 with the field name
  return User.create({ username, email, passwordHash });
}

export async function loginUser({ email, password }: LoginInput) {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password', { code: 'INVALID_CREDENTIALS' });
  return user;
}

export async function refreshSession(refreshToken: string) {
  const invalid = () => new HttpError(401, 'Please log in again', { code: 'REFRESH_INVALID' });

  let payload: { sub: string; tv: number };
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw invalid();
  }

  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.tokenVersion !== payload.tv) throw invalid();
  return user;
}
