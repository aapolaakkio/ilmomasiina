import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import EditSignupForm from "@/components/EditSignupForm";
import { getLocalizedEvent, getLocalizedSignup } from "@/lib/localizedEvent";
import type { SignupID } from "@/db/schema";
import { getCachedSignupForEdit } from "@/cache/signups";
import { verifyToken } from "@/services/signups/editTokens";

/** Edit links are per-signup secrets; nothing is enumerated at build time. */
export function generateStaticParams() {
  return [{ id: "__placeholder__", editToken: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/signup/[id]/[editToken]">): Promise<Metadata> {
  const { id, editToken } = await params;
  const locale = await getLocale();
  const t = await getTranslations("editSignup");
  const signupId = id as SignupID;
  if (!verifyToken(signupId, editToken)) return {};
  try {
    const data = await getCachedSignupForEdit(signupId);
    const localized = getLocalizedEvent(data.event, locale);
    const isConfirmed = data.signup.confirmed;
    return {
      title: `${isConfirmed ? t("titleEdit") : t("titleSignup")} – ${localized.title}`,
    };
  } catch {
    return {};
  }
}

export default async function EditSignupPage({ params }: PageProps<"/[locale]/signup/[id]/[editToken]">) {
  const { id, editToken } = await params;
  const locale = await getLocale();
  const signupId = id as SignupID;

  if (!verifyToken(signupId, editToken)) {
    notFound();
  }

  try {
    const data = await getCachedSignupForEdit(signupId);

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
