import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import EditSignupForm from "@/components/EditSignupForm";
import { getLocalizedEvent, getLocalizedSignup } from "@/lib/localizedEvent";
import type { SignupID } from "@/models";
import { completePayment } from "@/services/payment/completePayment";
import { verifyToken } from "@/services/signups/editTokens";
import { getSignupForEdit } from "@/services/signups/getSignupForEdit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; editToken: string }>;
}): Promise<Metadata> {
  const { id, editToken } = await params;
  if (!verifyToken(id as SignupID, editToken)) return {};
  const locale = await getLocale();
  const t = await getTranslations("editSignup");
  try {
    const data = await getSignupForEdit(id as SignupID);
    const localized = getLocalizedEvent(data.event, locale);
    return { title: `${t("titleView")} – ${localized.title}` };
  } catch {
    return {};
  }
}

export default async function PaymentCompletionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; editToken: string }>;
}) {
  const { locale: language, id, editToken } = await params;

  if (!verifyToken(id as SignupID, editToken)) {
    notFound();
  }

  try {
    const data = await completePayment(id as SignupID);

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
