import { getTranslations } from "next-intl/server";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors.404");
  const tCommon = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-6">
        <div className="text-center">
          <h1 className="mb-4 text-4xl">{t("title")}</h1>
          <p className="mb-6 text-gray-600">{t("description")}</p>
          <Link href="/" className="text-brand-600 hover:underline">
            {tCommon("returnToEvents")}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
