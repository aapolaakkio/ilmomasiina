import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import EditSignupForm from "@/components/EditSignupForm";
import { getLocalizedEvent, getLocalizedSignup } from "@/lib/localizedEvent";
import { internalAuditLogger } from "@/auditlog";
import type { SignupID } from "@/db/schema";
import { completePayment } from "@/services/payment/completePayment";
import { verifyToken } from "@/services/signups/editTokens";
import { getSignupForEdit } from "@/services/signups/getSignupForEdit";

export async function generateMetadata({ params }: PageProps<"/[locale]/payment/[id]/[editToken]">): Promise<Metadata> {
  const { id, editToken } = await params;
  const signupId = id as SignupID;
  if (!verifyToken(signupId, editToken)) return {};
  const locale = await getLocale();
  const t = await getTranslations("editSignup");
  try {
    const data = await getSignupForEdit(signupId);
    const localized = getLocalizedEvent(data.event, locale);
    return { title: `${t("titleView")} – ${localized.title}` };
  } catch {
    return {};
  }
}

export default async function PaymentCompletionPage({ params }: PageProps<"/[locale]/payment/[id]/[editToken]">) {
  const { id, editToken } = await params;
  const locale = await getLocale();
  const signupId = id as SignupID;

  if (!verifyToken(signupId, editToken)) {
    notFound();
  }

  try {
    const data = await completePayment(signupId, internalAuditLogger);

    const localizedEvent = getLocalizedEvent(data.event, locale);
    const localizedSignup = getLocalizedSignup(data, locale);

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
