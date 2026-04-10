'use client';

import { useAuth } from './AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/auth') {
      router.push('/auth');
    }
    if (!isLoading && user && pathname === '/auth') {
      router.push('/');
    }
  }, [user, isLoading, pathname, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-500 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 animate-pulse">
            <img 
              src="/drexel/College_ComputingInformatics-oneline100height.png" 
              alt="Drexel University - College of Computing & Informatics"
              className="h-40 w-auto object-contain drop-shadow-lg mx-auto"
            />
          </div>
          <div className="text-white text-lg font-semibold mb-2">AI Teaching Assistant</div>
          <div className="text-blue-200 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated (unless already on auth page)
  if (!user && pathname !== '/auth') {
    return null; // Router will redirect
  }

  // Show children if authenticated (unless on auth page)
  if (user && pathname === '/auth') {
    return null; // Router will redirect
  }

  return <>{children}</>;
}
