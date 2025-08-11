import { MainLayout } from "@/features/shared";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
