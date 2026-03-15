import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import EditSignupForm from "@/components/EditSignupForm";
import { getLocalizedEvent, getLocalizedSignup } from "@/lib/localizedEvent";
import type { SignupID } from "@/models";
import { getSignupForEdit } from "@/services/signups/getSignupForEdit";
import { verifyToken } from "@/services/signups/editTokens";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; editToken: string }>;
}): Promise<Metadata> {
  const { id, editToken } = await params;
  const locale = await getLocale();
  const t = await getTranslations("editSignup");
  if (!verifyToken(id as SignupID, editToken)) return {};
  try {
    const data = await getSignupForEdit(id as SignupID);
    const localized = getLocalizedEvent(data.event, locale);
    const isConfirmed = data.signup.confirmed;
    return { title: `${isConfirmed ? t("titleEdit") : t("titleSignup")} – ${localized.title}` };
  } catch {
    return {};
  }
}

export default async function EditSignupPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; editToken: string }>;
}) {
  const { locale: language, id, editToken } = await params;

  if (!verifyToken(id as SignupID, editToken)) {
    notFound();
  }

  try {
    const data = await getSignupForEdit(id as SignupID);

    const localizedEvent = getLocalizedEvent(data.event, language);
    const localizedSignup = getLocalizedSignup(data, language);

    const localizedData = {
      ...data,
      event: localizedEvent,
      signup: localizedSignup,
    };

    return <EditSignupForm data={localizedData} editToken={editToken} />;
  } catch {
    notFound();
  }
}
