import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import SetupForm from "@/components/SetupForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("initialSetup");
  return { title: t("title") };
}

export default function SetupPage() {
  return <SetupForm />;
}
