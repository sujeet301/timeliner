// src/hooks/useAuth.js
import { useSelector } from 'react-redux';

export function useAuth() {
  const { user, accessToken, status, error, bootstrapping } = useSelector((state) => state.auth);
  return { user, isAuthenticated: Boolean(accessToken && user), status, error, bootstrapping };
}
