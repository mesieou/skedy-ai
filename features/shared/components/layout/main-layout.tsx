import { Navbar } from "./navbar";
import { Footer } from "./footer";

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
      {/* Sleek separator before footer */}
      <div className="py-8 bg-transparent">
        <div className="section-separator"></div>
      </div>
      <Footer />
    </main>
  );
}
