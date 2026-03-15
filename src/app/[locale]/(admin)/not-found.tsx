import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

export default async function AdminNotFound() {
  const t = await getTranslations("errors.404");
  const tCommon = await getTranslations("common");

  return (
    <div className="py-16 text-center">
      <h1 className="mb-4 text-4xl">{t("title")}</h1>
      <p className="mb-6 text-gray-600">{t("description")}</p>
      <Link href="/admin">
        <Button variant="outline">{tCommon("back")}</Button>
      </Link>
    </div>
  );
}
