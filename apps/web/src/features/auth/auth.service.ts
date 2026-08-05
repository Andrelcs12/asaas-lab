import { api } from '@/lib/api';
import type { AuthUser, LoginResponse } from './types';

export const authService = {
  login(email: string, password: string) {
    return api.post<LoginResponse>('/auth/login', { email, password });
  },

  me() {
    return api.get<AuthUser>('/auth/me');
  },
};
