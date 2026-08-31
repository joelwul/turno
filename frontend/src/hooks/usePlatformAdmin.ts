import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isPlatformAdmin } from '../services/admin';

export function usePlatformAdmin(): boolean {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (session) void isPlatformAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
    else setIsAdmin(false);
  }, [session]);
  return isAdmin;
}