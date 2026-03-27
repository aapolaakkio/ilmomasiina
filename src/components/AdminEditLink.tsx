import { Link } from "@/i18n/navigation";
import { Button } from "./ui/Button";
import { getTranslations } from "next-intl/server";

export default async function AdminEditLink({ event }: { event: { id: string } }) {
  const t = await getTranslations("singleEvent");
  return (
    <Link href={`/admin/edit/${event.id}`}>
      <Button variant="outline" size="small">
        {t("editEvent")}
      </Button>
    </Link>
  );
}
