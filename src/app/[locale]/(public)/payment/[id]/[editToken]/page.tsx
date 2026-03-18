import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import EditSignupForm from "@/components/EditSignupForm";
import { getLocalizedEvent, getLocalizedSignup } from "@/lib/localizedEvent";
import type { SignupID } from "@/db/schema";
import { completePayment } from "@/services/payment/completePayment";
import { verifyToken } from "@/services/signups/editTokens";
import { getSignupForEdit } from "@/services/signups/getSignupForEdit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: SignupID; editToken: string }>;
}): Promise<Metadata> {
  const { id, editToken } = await params;
  if (!verifyToken(id, editToken)) return {};
  const locale = await getLocale();
  const t = await getTranslations("editSignup");
  try {
    const data = await getSignupForEdit(id);
    const localized = getLocalizedEvent(data.event, locale);
    return { title: `${t("titleView")} – ${localized.title}` };
  } catch {
    return {};
  }
}

export default async function PaymentCompletionPage({
  params,
}: {
  params: Promise<{ locale: string; id: SignupID; editToken: string }>;
}) {
  const { locale: language, id, editToken } = await params;

  if (!verifyToken(id, editToken)) {
    notFound();
  }

  try {
    const data = await completePayment(id);

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
