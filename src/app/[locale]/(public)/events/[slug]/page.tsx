import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import Markdown from "@/components/Markdown";
import SignupButton from "@/components/SignupButton";
import { env } from "@/env";
import { Link } from "@/i18n/navigation";
import { verifyAdminSession } from "@/auth/jwt";
import { getLocalizedEvent } from "@/lib/localizedEvent";
import { getSignupsByQuota, stringifyAnswer } from "@/lib/signupUtils";
import { Button } from "@/components/ui/Button";
import { SignupStatus } from "@/models";
import { getEventBySlug } from "@/services/events/getEventDetails";

function formatDateTime(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: process.env.APP_TIMEZONE ?? "Europe/Helsinki",
  }).format(new Date(date));
}

function formatSignupTime(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    timeZone: process.env.APP_TIMEZONE ?? "Europe/Helsinki",
  }).format(new Date(date));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  try {
    const event = await getEventBySlug(slug);
    const localized = getLocalizedEvent(event, locale);
    return { title: localized.title };
  } catch {
    return {};
  }
}

export default async function SingleEventPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: language, slug } = await params;

  let event;
  try {
    event = await getEventBySlug(slug);
  } catch {
    notFound();
  }

  const t = await getTranslations("singleEvent");

  const localizedEvent = getLocalizedEvent(event, language);
  const signupsByQuota = getSignupsByQuota(localizedEvent);
  const locale = language === "en" ? "en-FI" : "fi-FI";
  const publicQuestions = localizedEvent.questions.filter((q) => q.public);
  const adminSession = await verifyAdminSession();

  return (
    <>
      <Link href="/" className="text-sm text-brand-600 hover:underline">
        {"\u2190 " + t("back")}
      </Link>
      <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <h1 className="text-2xl font-bold">{localizedEvent.title}</h1>
            {adminSession && (
              <Link href={`/admin/edit/${event.id}`}>
                <Button variant="outline" size="small">
                  {t("editEvent")}
                </Button>
              </Link>
            )}
          </div>
          <div className="mb-6 space-y-1 border-y border-gray-200 py-4 text-sm text-gray-700">
            {localizedEvent.category && (
              <p>
                <span className="font-semibold">{t("category")}</span> {localizedEvent.category}
              </p>
            )}
            {localizedEvent.date && (
              <p>
                <span className="font-semibold">{localizedEvent.endDate ? t("startDate") : t("date")}</span>{" "}
                {formatDateTime(localizedEvent.date, locale)}
              </p>
            )}
            {localizedEvent.endDate && (
              <p>
                <span className="font-semibold">{t("endDate")}</span> {formatDateTime(localizedEvent.endDate, locale)}
              </p>
            )}
            {localizedEvent.location && (
              <p>
                <span className="font-semibold">{t("location")}</span> {localizedEvent.location}
              </p>
            )}
            {localizedEvent.price && (
              <p>
                <span className="font-semibold">{t("price")}</span> {localizedEvent.price}
              </p>
            )}
            {localizedEvent.webpageUrl && (
              <p>
                <span className="font-semibold">{t("website")}</span>{" "}
                <a href={localizedEvent.webpageUrl} className="text-brand-600 hover:underline">
                  {localizedEvent.webpageUrl}
                </a>
              </p>
            )}
            {localizedEvent.facebookUrl && (
              <p>
                <span className="font-semibold">{t("facebookEvent")}</span>{" "}
                <a href={localizedEvent.facebookUrl} className="text-brand-600 hover:underline">
                  {localizedEvent.facebookUrl}
                </a>
              </p>
            )}
          </div>
          {localizedEvent.description && <Markdown>{localizedEvent.description}</Markdown>}
          {env.NEXT_PUBLIC_BRANDING_CANCELLATION_LINK && (
            <p className="mt-6 border-t border-gray-200 pt-4 text-sm text-gray-600">
              {t("cancellation")}{" "}
              <a href={env.NEXT_PUBLIC_BRANDING_CANCELLATION_LINK} className="text-brand-600 hover:underline">
                {t("cancellationLink")}
              </a>
              .
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-100 p-6">
            <SignupButton
              event={localizedEvent}
              registrationClosed={event.registrationClosed}
              millisTillOpening={event.millisTillOpening}
            />
          </div>

          {signupsByQuota.length > 0 && (
            <div className="rounded-lg bg-gray-100 p-6">
              <h3 className="mb-3 text-lg font-semibold">{t("signupsTitle")}</h3>
              {signupsByQuota.map((quota) => {
                if (quota.type === SignupStatus.IN_QUEUE) {
                  if (quota.signupCount > 0) {
                    return (
                      <p key={quota.type} className="text-sm text-gray-600">
                        {t("inQueue", { count: quota.signupCount })}
                      </p>
                    );
                  }
                  return null;
                }
                const title = quota.type === SignupStatus.IN_OPEN_QUOTA ? t("openQuota") : (quota.title ?? "");
                const max = quota.size ?? Infinity;
                return (
                  <div key={quota.id ?? quota.type} className="mb-3">
                    <div className="flex justify-between text-sm">
                      <span>{title}</span>
                      <span className="text-gray-600">
                        {quota.signupCount} / {max === Infinity ? "\u221E" : max}
                      </span>
                    </div>
                    {max !== Infinity && (
                      <div
                        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                        role="progressbar"
                        aria-valuenow={quota.signupCount}
                        aria-valuemin={0}
                        aria-valuemax={max}
                        aria-label={`${title} signup progress`}
                      >
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${Math.min(100, (quota.signupCount / max) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {localizedEvent.signupsPublic && (
        <>
          <h2 className="mb-4 mt-8 text-xl font-bold">{t("signupsTitle")}</h2>
          {signupsByQuota.map((quota) => (
            <div key={quota.id ?? quota.type} className="mb-6">
              <h3 className="mb-2 text-lg font-semibold">
                {quota.type === SignupStatus.IN_QUOTA
                  ? quota.title
                  : quota.type === SignupStatus.IN_OPEN_QUOTA
                    ? t("openQuota")
                    : t("inQueue", { count: quota.signupCount })}
              </h3>
              {!quota.signups?.length ? (
                <p className="text-sm text-gray-500">{t("noSignups")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2 font-semibold text-gray-700">{t("position")}</th>
                        {localizedEvent.nameQuestion && (
                          <th className="min-w-[90px] px-3 py-2 font-semibold text-gray-700">{t("name")}</th>
                        )}
                        {publicQuestions.map((q) => (
                          <th key={q.id} className="px-3 py-2 font-semibold text-gray-700">
                            {q.question}
                          </th>
                        ))}
                        {localizedEvent.quotas.length > 1 && quota.type !== SignupStatus.IN_QUOTA && (
                          <th className="px-3 py-2 font-semibold text-gray-700">{t("quota")}</th>
                        )}
                        <th className="min-w-[130px] px-3 py-2 font-semibold text-gray-700">{t("signupTime")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quota.signups.map((signup, i) => (
                        <tr
                          key={signup.createdAt}
                          className={`border-b border-gray-100 ${!signup.confirmed ? "text-gray-400" : ""}`}
                        >
                          <td className="px-3 py-2">
                            {i + 1}
                            {!signup.confirmed && !localizedEvent.nameQuestion && (
                              <span className="ml-2 italic">{t("unconfirmed")}</span>
                            )}
                          </td>
                          {localizedEvent.nameQuestion && (
                            <td className="px-3 py-2">
                              {!signup.confirmed ? (
                                <span className="italic">{t("unconfirmed")}</span>
                              ) : signup.firstName && signup.lastName ? (
                                `${signup.firstName} ${signup.lastName}`
                              ) : (
                                t("nameHidden")
                              )}
                            </td>
                          )}
                          {publicQuestions.map((q) => {
                            const answer = signup.answers?.find((a) => a.questionId === q.id);
                            return (
                              <td key={q.id} className="px-3 py-2">
                                {stringifyAnswer(answer?.answer)}
                              </td>
                            );
                          })}
                          {localizedEvent.quotas.length > 1 && quota.type !== SignupStatus.IN_QUOTA && (
                            <td className="px-3 py-2">{signup.quota?.title}</td>
                          )}
                          <td className="px-3 py-2">{formatSignupTime(signup.createdAt, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}
