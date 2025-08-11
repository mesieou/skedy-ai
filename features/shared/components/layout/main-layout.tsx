import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <Navbar />
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          {children}
        </div>
        <Footer />
      </div>
    </main>
  );
}
