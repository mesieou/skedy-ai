import { Navbar } from "./navbar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      {/* Sleek separator after navbar */}
      <div className="pt-20 pb-4 bg-transparent">
        <div className="section-separator"></div>
      </div>
      <div className="flex-1 w-full bg-transparent">
        {children}
      </div>
    </main>
  );
}
