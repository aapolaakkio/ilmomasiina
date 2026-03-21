import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import LoginForm from "@/components/LoginForm";
import { db } from "@/db";
import { env } from "@/env";
import { isInitialSetupDone } from "@/services/admin/users/helpers";

export async function generateMetadata(): Promise<Metadata> {
  const done = await isInitialSetupDone(db);
  const t = await getTranslations("login");
  return { title: done ? t("title") : t("setupTitle") };
}

export default async function LoginPage(_props: PageProps<"/[locale]/login">) {
  const done = await isInitialSetupDone(db);
  return <LoginForm initialSetup={!done} testCredentialsEnabled={env.THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED} />;
}
