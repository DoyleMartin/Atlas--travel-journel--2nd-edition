import { createContext, useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { onSessionLost } from '../services/api';
import {
  fetchMe,
  loginRequest,
  logoutRequest,
  registerRequest,
  type LoginInput,
  type RegisterInput,
} from '../features/auth/authAPI';
import type { User } from '../types/api';

export type AuthStatus = 'loading' | 'authed' | 'anon';

interface AuthState {
  status: AuthStatus;
  user: User | null;
}

type AuthAction = { type: 'SIGNED_IN'; user: User } | { type: 'SIGNED_OUT' };

function authReducer(_state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SIGNED_IN':
      return { status: 'authed', user: action.user };
    case 'SIGNED_OUT':
      return { status: 'anon', user: null };
  }
}

export interface AuthContextValue extends AuthState {
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { status: 'loading', user: null });

  useEffect(() => {
    let active = true;
    // Restores the session from cookies on page load (refreshing first if the access token expired)
    fetchMe()
      .then((user) => active && dispatch({ type: 'SIGNED_IN', user }))
      .catch(() => active && dispatch({ type: 'SIGNED_OUT' }));

    onSessionLost(() => dispatch({ type: 'SIGNED_OUT' }));
    return () => {
      active = false;
      onSessionLost(null);
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const user = await loginRequest(input);
    dispatch({ type: 'SIGNED_IN', user });
    return user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const user = await registerRequest(input);
    dispatch({ type: 'SIGNED_IN', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      dispatch({ type: 'SIGNED_OUT' });
    }
  }, []);

  const value = useMemo(() => ({ ...state, login, register, logout }), [state, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
