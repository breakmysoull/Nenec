import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export const AppLayout = ({ children, title }: AppLayoutProps) => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title={title} showBackButton={!isDashboard} />
      <main className="flex-1 pb-20 overflow-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
