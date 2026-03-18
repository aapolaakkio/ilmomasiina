import { Body, Container, Head, Hr, Html, Link, Preview, Section, Text, render } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

import en from "@/i18n/en";
import fi from "@/i18n/fi";
import { SignupPaymentStatus } from "@/db/schema";

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};
type EmailTranslations = DeepStringify<typeof en.emails>;
function getEmailTranslations(lang: ResolvedLanguage): EmailTranslations {
  return lang === "fi" ? fi.emails : en.emails;
}

/** Plain event data used in email templates. */
export interface MailEventData {
  title: string;
  verificationEmail?: string | null;
  [key: string]: unknown;
}

export interface ConfirmationMailParams {
  name: string;
  email: string;
  quota: string;
  answers: {
    label: string;
    answer: string;
  }[];
  queuePosition: number | null;
  type: "signup" | "edit";
  admin: boolean;
  date: string | null;
  event: MailEventData;
  paymentStatus: SignupPaymentStatus | null;
  cancelLink: string;
}

export interface PaymentMailParams {
  totalFormatted: string;
  currency: string;
  products: {
    name: string;
    amount: number;
    unitPriceFormatted: string;
  }[];
  event: MailEventData;
  cancelLink: string;
}

export interface PromotedFromQueueMailParams {
  event: MailEventData;
  date: string | null;
  paymentStatus: SignupPaymentStatus | null;
  cancelLink: string;
}

export interface NewUserMailParams {
  email: string;
  loginUrl: string;
}

interface BrandingData {
  footerText?: string | null;
  footerLink?: string | null;
}

type MailTemplateName = "confirmation" | "payment" | "newUser" | "queueMail";
type ResolvedLanguage = "en" | "fi";

type MailTemplateDataMap = {
  confirmation: ConfirmationMailParams;
  payment: PaymentMailParams;
  newUser: NewUserMailParams;
  queueMail: PromotedFromQueueMailParams;
};

interface RenderMailTemplateParams<T extends MailTemplateName> {
  template: T;
  language: string | null;
  defaultLanguage: string;
  branding: BrandingData;
  data: MailTemplateDataMap[T];
}

interface BaseTemplateProps {
  lang: ResolvedLanguage;
  preview: string;
  branding: BrandingData;
  children: ReactNode;
}

function resolveLanguage(language: string | null, defaultLanguage: string): ResolvedLanguage {
  if (language === "fi" || language === "en") return language;
  if (defaultLanguage === "fi" || defaultLanguage === "en") return defaultLanguage;
  return "en";
}

function eventString(event: MailEventData, key: string): string {
  const value = event[key];
  return typeof value === "string" ? value : "";
}

function BaseTemplate({ lang, preview, branding, children }: BaseTemplateProps) {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            {children}
            {(branding.footerText || branding.footerLink) && (
              <>
                <Hr style={styles.hr} />
                <Section>
                  {branding.footerText && <Text style={styles.footerText}>{branding.footerText}</Text>}
                  {branding.footerLink && (
                    <Text style={styles.footerText}>
                      <Link href={branding.footerLink} style={styles.footerLink}>
                        {branding.footerLink.replace(/^https?:\/\//, "")}
                      </Link>
                    </Text>
                  )}
                </Section>
              </>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function PendingPaymentNotice({
  lang,
  event,
  cancelLink,
}: {
  lang: ResolvedLanguage;
  event: MailEventData;
  cancelLink: string;
}) {
  const e = getEmailTranslations(lang);
  const c = e.confirmation;
  const paymentMode = eventString(event, "payments");
  return (
    <Text style={styles.text}>
      <strong>{c.pendingPayment}</strong>{" "}
      {paymentMode === "online" &&
        (() => {
          const [before, after] = c.pendingPaymentLink.split("{link}");
          return (
            <>
              {before}
              <Link href={cancelLink}>{c.pendingPaymentLinkText}</Link>
              {after}
            </>
          );
        })()}
    </Text>
  );
}

function ConfirmationTemplate({
  lang,
  branding,
  params,
}: {
  lang: ResolvedLanguage;
  branding: BrandingData;
  params: ConfirmationMailParams;
}) {
  const e = getEmailTranslations(lang);
  const c = e.confirmation;
  const location = eventString(params.event, "location");
  return (
    <BaseTemplate lang={lang} branding={branding} preview={c.preview.replace("{event}", params.event.title)}>
      {params.admin && params.type === "signup" && (
        <Text style={styles.text}>
          <strong>{c.adminSignup}</strong>
        </Text>
      )}
      {params.admin && params.type === "edit" && (
        <Text style={styles.text}>
          <strong>{c.adminEdit}</strong>
        </Text>
      )}

      {params.paymentStatus === SignupPaymentStatus.PENDING && (
        <PendingPaymentNotice lang={lang} event={params.event} cancelLink={params.cancelLink} />
      )}

      {params.event.verificationEmail && <Text style={styles.text}>{params.event.verificationEmail}</Text>}

      {params.queuePosition && (
        <Text style={styles.text}>
          <strong>{c.queuePosition.replace("{position}", String(params.queuePosition))}</strong> {c.queueNotice}
        </Text>
      )}

      <Text style={styles.sectionTitle}>{c.eventDetailsTitle}</Text>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          <strong>{c.event}</strong> {params.event.title}
        </li>
        <li style={styles.listItem}>
          <strong>{c.location}</strong> {location}
        </li>
        {params.date && (
          <li style={styles.listItem}>
            <strong>{c.time}</strong> {params.date}
          </li>
        )}
      </ul>

      <Text style={styles.sectionTitle}>{c.signupDetailsTitle}</Text>
      <ul style={styles.list}>
        {!!params.name && (
          <li style={styles.listItem}>
            <strong>{c.name}</strong> {params.name}
          </li>
        )}
        <li style={styles.listItem}>
          <strong>{c.email}</strong> {params.email}
        </li>
        <li style={styles.listItem}>
          <strong>{c.quota}</strong> {params.quota}
        </li>
        {params.answers.map((answer) => (
          <li key={answer.label} style={styles.listItem}>
            <strong>{answer.label}:</strong> {answer.answer}
          </li>
        ))}
      </ul>

      <Text style={styles.text}>
        {c.editLinkPrefix} <Link href={params.cancelLink}>{c.editLinkText}</Link>.
      </Text>
    </BaseTemplate>
  );
}

function PaymentTemplate({
  lang,
  branding,
  params,
}: {
  lang: ResolvedLanguage;
  branding: BrandingData;
  params: PaymentMailParams;
}) {
  const e = getEmailTranslations(lang);
  const p = e.payment;
  return (
    <BaseTemplate lang={lang} branding={branding} preview={p.preview.replace("{event}", params.event.title)}>
      <Text style={styles.text}>{p.received.replace("{event}", params.event.title)}</Text>

      {params.event.verificationEmail && <Text style={styles.text}>{params.event.verificationEmail}</Text>}

      <Text style={styles.sectionTitle}>{p.purchaseDetails}</Text>
      <table style={styles.table}>
        <tbody>
          {params.products.map((product) => (
            <tr key={`${product.name}-${product.unitPriceFormatted}-${product.amount}`}>
              <td style={styles.tableCell}>{product.amount}x</td>
              <td style={styles.tableCell}>{product.name}</td>
              <td style={styles.tableCellRight}>{product.unitPriceFormatted}</td>
            </tr>
          ))}
          <tr>
            <th colSpan={2} style={styles.tableHeader}>
              {p.total}
            </th>
            <th style={styles.tableHeaderRight}>{params.totalFormatted}</th>
          </tr>
        </tbody>
      </table>

      <Text style={styles.text}>
        {p.viewLinkPrefix} <Link href={params.cancelLink}>{p.viewLinkText}</Link>.
      </Text>
    </BaseTemplate>
  );
}

function NewUserTemplate({
  lang,
  branding,
  params,
}: {
  lang: ResolvedLanguage;
  branding: BrandingData;
  params: NewUserMailParams;
}) {
  const e = getEmailTranslations(lang);
  const n = e.newUser;
  return (
    <BaseTemplate lang={lang} branding={branding} preview={n.preview}>
      <Text style={styles.text}>{n.intro}</Text>
      <Text style={styles.text}>
        {n.loginPrefix} <Link href={params.loginUrl}>{params.loginUrl}</Link>.
      </Text>
    </BaseTemplate>
  );
}

function QueueMailTemplate({
  lang,
  branding,
  params,
}: {
  lang: ResolvedLanguage;
  branding: BrandingData;
  params: PromotedFromQueueMailParams;
}) {
  const e = getEmailTranslations(lang);
  const q = e.queueMail;
  const c = e.confirmation;
  const location = eventString(params.event, "location");
  return (
    <BaseTemplate lang={lang} branding={branding} preview={q.preview.replace("{event}", params.event.title)}>
      <Text style={styles.text}>{q.accepted.replace("{event}", params.event.title)}</Text>

      {params.paymentStatus === SignupPaymentStatus.PENDING && (
        <PendingPaymentNotice lang={lang} event={params.event} cancelLink={params.cancelLink} />
      )}

      <Text style={styles.sectionTitle}>{c.eventDetailsTitle}</Text>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          <strong>{c.event}</strong> {params.event.title}
        </li>
        <li style={styles.listItem}>
          <strong>{c.location}</strong> {location}
        </li>
        {params.date && (
          <li style={styles.listItem}>
            <strong>{c.time}</strong> {params.date}
          </li>
        )}
      </ul>

      <Text style={styles.text}>
        {q.editLinkPrefix} <Link href={params.cancelLink}>{q.editLinkText}</Link>.
      </Text>
    </BaseTemplate>
  );
}

export async function renderMailTemplate<T extends MailTemplateName>({
  template,
  language,
  defaultLanguage,
  branding,
  data,
}: RenderMailTemplateParams<T>): Promise<{
  html: string;
  lng: ResolvedLanguage;
}> {
  const lng = resolveLanguage(language, defaultLanguage);
  let templateNode: ReactNode;

  switch (template) {
    case "confirmation":
      templateNode = <ConfirmationTemplate lang={lng} branding={branding} params={data as ConfirmationMailParams} />;
      break;
    case "payment":
      templateNode = <PaymentTemplate lang={lng} branding={branding} params={data as PaymentMailParams} />;
      break;
    case "newUser":
      templateNode = <NewUserTemplate lang={lng} branding={branding} params={data as NewUserMailParams} />;
      break;
    case "queueMail":
      templateNode = <QueueMailTemplate lang={lng} branding={branding} params={data as PromotedFromQueueMailParams} />;
      break;
    default:
      throw new Error(`Unknown mail template: ${String(template)}`);
  }

  const html = await render(templateNode);
  return { html, lng };
}

const styles: Record<string, CSSProperties> = {
  body: {
    margin: 0,
    backgroundColor: "#f6f6f6",
    fontFamily: "'Open Sans', Arial, sans-serif",
    color: "#333333",
  },
  container: {
    margin: "0 auto",
    padding: "24px 12px",
    maxWidth: "600px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "6px",
    border: "1px solid #e6e6e6",
    padding: "20px",
  },
  text: {
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0 0 12px",
  },
  sectionTitle: {
    fontSize: "14px",
    lineHeight: "1.6",
    fontWeight: "bold",
    margin: "16px 0 8px",
  },
  list: {
    margin: "0 0 12px 20px",
    padding: 0,
  },
  listItem: {
    marginBottom: "6px",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "12px",
  },
  tableCell: {
    padding: "6px 0",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "14px",
  },
  tableCellRight: {
    padding: "6px 0",
    borderBottom: "1px solid #f0f0f0",
    textAlign: "right",
    fontSize: "14px",
  },
  tableHeader: {
    paddingTop: "8px",
    textAlign: "left",
    fontSize: "14px",
  },
  tableHeaderRight: {
    paddingTop: "8px",
    textAlign: "right",
    fontSize: "14px",
  },
  hr: {
    borderColor: "#eeeeee",
    margin: "16px 0",
  },
  footerText: {
    textAlign: "center",
    color: "#666666",
    fontSize: "12px",
    margin: "0 0 6px",
  },
  footerLink: {
    color: "#666666",
    textDecoration: "underline",
  },
};
