import { useMutation, useQuery } from '@tanstack/react-query';
import type { Route } from '@tuyau/core/types';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useConfirm } from '#/providers/confirm-dialog-provider';
import { query } from '#/services/api';
import { getToken, removeToken, setToken } from '#/shared/token';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';
type UserProfile = Route.Response<'session.create'>['data']['user'];

export type AuthContextValue = {
  status: AuthStatus;
  user: UserProfile | null;
  login: (payload: Route.Body<'session.create'>) => Promise<void>;
  logout: () => Promise<void>;
  isLoginPending: boolean;
  loginError: Route.Error<'session.create'> | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { confirm } = useConfirm();
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? 'checking' : 'unauthenticated'));
  const [user, setUser] = useState<UserProfile | null>(null);

  const {
    mutate: loginMutation,
    isPending,
    error: loginError,
  } = useMutation(
    query.session.create.mutationOptions({
      onSuccess: (resp) => {
        setToken(resp.data.token);
        setUser(resp.data.user);
        setStatus('authenticated');
      },
    }),
  );
  const {
    data: validateData,
    error: validateError,
    isLoading: isValidateLoading,
  } = useQuery(
    query.session.validate.queryOptions(
      {},
      {
        enabled: status === 'checking',
      },
    ),
  );

  const login: AuthContextValue['login'] = useCallback(async (payload) => {
    loginMutation({ body: payload });
  }, []);

  const logout: AuthContextValue['logout'] = useCallback(async () => {
    const confirmed = await confirm({
      title: '退出登录',
      description: '确认退出当前账号？',
      confirmBtnText: '退出',
      danger: true,
    });
    if (!confirmed) return;
    removeToken();
    setUser(null);
    setStatus('unauthenticated');
  }, [confirm]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      logout,
      isLoginPending: isPending,
      loginError,
    }),
    [status, user, login, logout, isPending, loginError],
  );

  useEffect(() => {
    if (validateError) {
      removeToken();
      setUser(null);
      setStatus('unauthenticated');
    } else if (!isValidateLoading && validateData) {
      setStatus('authenticated');
      setUser(validateData.data);
    }
  }, [validateError, isValidateLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
