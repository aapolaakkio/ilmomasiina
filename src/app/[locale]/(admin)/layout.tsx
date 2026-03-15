import AdminHeader from "@/components/AdminHeader";
import Footer from "@/components/Footer";
import RenewLogin from "@/components/RenewLogin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <RenewLogin />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </div>
  );
}
