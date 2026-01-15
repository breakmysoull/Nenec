import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export const AppLayout = ({ children, title }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title={title} />
      <main className="flex-1 pb-20 overflow-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
