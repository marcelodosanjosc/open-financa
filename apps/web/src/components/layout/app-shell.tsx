'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/cadastro';

  if (isAuthPage) {
    return <main className="flex-1 flex flex-col min-w-0 min-h-screen">{children}</main>;
  }

  return (
    <div className="flex w-full min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
