import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function PublicLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </div>
  );
}
