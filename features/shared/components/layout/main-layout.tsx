import { Navbar } from "./navbar";
import { Footer } from "./footer";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 w-full">
        {children}
      </div>
      <Footer />
    </main>
  );
}
