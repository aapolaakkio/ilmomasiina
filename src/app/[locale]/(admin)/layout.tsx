import AdminHeader from "@/components/AdminHeader";
import Footer from "@/components/Footer";

export default function AdminLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </div>
  );
}
