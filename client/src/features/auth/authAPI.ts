import api from '../../services/api';
import type { User } from '../../types/api';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  username: string;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<{ user: User }>('/auth/me');
  return data.user;
}

export async function loginRequest(input: LoginInput): Promise<User> {
  const { data } = await api.post<{ user: User }>('/auth/login', input);
  return data.user;
}

export async function registerRequest(input: RegisterInput): Promise<User> {
  const { data } = await api.post<{ user: User }>('/auth/register', input);
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}
