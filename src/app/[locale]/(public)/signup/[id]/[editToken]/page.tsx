import { notFound } from "next/navigation";

import EditSignupForm from "@/components/EditSignupForm";
import { getLocalizedEvent, getLocalizedSignup } from "@/lib/localizedEvent";
import type { SignupID } from "@/models";
import { getSignupForEdit } from "@/services/signups/getSignupForEdit";
import { verifyToken } from "@/services/signups/editTokens";

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
