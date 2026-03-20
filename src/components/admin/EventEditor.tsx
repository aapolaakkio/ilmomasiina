"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import { createEventAction } from "@/actions/createEvent";
import { updateEventAction } from "@/actions/updateEvent";
import { Link, useRouter } from "@/i18n/navigation";
import { type QuestionID, type QuotaID, type UserID } from "@/db/schema";
import type { AdminEventResponse } from "@/db/zod";
import { useFormValidation } from "@/lib/useFormValidation";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";

import BasicDetailsTab from "./editor/BasicDetailsTab";
import { EDITOR_BASIC_TAB_ERROR_KEY_SET, editorSchema, editorValidationPayload } from "./editor/editorSchema";
import EditorsTab from "./editor/EditorsTab";
import EmailsTab from "./editor/EmailsTab";
import { getInitialEditorForm } from "./editor/initialEditorForm";
import LanguageManager from "./editor/LanguageManager";
import PreviewTab from "./editor/PreviewTab";
import QuestionsTab from "./editor/QuestionsTab";
import QuotasTab from "./editor/QuotasTab";
import SignupsTab from "./editor/SignupsTab";
import { syncQuestionsAcrossLanguages, syncQuotasAcrossLanguages } from "./editor/syncLanguageVersions";
import { type EditorFormState, type EditorUpdateField } from "./editor/types";

/** Converts editor form state into the API request body for create/update. */
function buildEventUpdateBody(form: EditorFormState, asDraft: boolean) {
  return {
    title: form.title,
    slug: form.slug,
    draft: asDraft,
    listed: form.listed,
    category: form.category,
    date: form.date ? new Date(form.date) : null,
    endDate: form.endDate ? new Date(form.endDate) : null,
    registrationStartDate: form.registrationStartDate ? new Date(form.registrationStartDate) : null,
    registrationEndDate: form.registrationEndDate ? new Date(form.registrationEndDate) : null,
    openQuotaSize: form.openQuotaSize,
    description: form.description || null,
    price: form.price || null,
    location: form.location || null,
    webpageUrl: form.webpageUrl || null,
    signupsPublic: form.signupsPublic,
    nameQuestion: form.nameQuestion,
    emailQuestion: form.emailQuestion,
    payments: form.payments,
    defaultLanguage: form.defaultLanguage,
    languages: form.languages,
    verificationEmail: form.verificationEmail || null,
    quotas: form.quotas.map((q, i) => ({
      id: q.id,
      title: q.title,
      size: q.size,
      price: q.price,
      order: i,
    })),
    questions: form.questions.map((q, i) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      prices: q.prices,
      required: q.required,
      public: q.public,
      order: i,
    })),
  };
}

type Props = {
  event: AdminEventResponse | null;
  isNew: boolean;
  copy?: boolean;
  categories: string[];
  editors: { userId: UserID; email: string }[];
  readOnly?: boolean;
};

function TabWithErrorDot({ label, show }: { label: string; show: boolean }) {
  return (
    <>
      {label}
      {show ? <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden /> : null}
    </>
  );
}

export default function EventEditor({ event: initialEvent, isNew, copy, categories, editors, readOnly }: Props) {
  const router = useRouter();
  const t = useTranslations("editor");
  const effectiveIsNew = isNew || !!copy;

  const initial = getInitialEditorForm(initialEvent, copy);

  const [form, setForm] = useState(initial);
  const [selectedLanguage, setSelectedLanguage] = useState(initial.defaultLanguage || "fi");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedEvent, setSavedEvent] = useState(initialEvent);
  const [editConflict, setEditConflict] = useState<{
    updatedAt: Date;
    deletedQuotas: QuotaID[];
    deletedQuestions: QuestionID[];
  } | null>(null);
  const [moveToQueueWarning, setMoveToQueueWarning] = useState<{
    count: number;
    draft: boolean;
  } | null>(null);
  const { fieldErrors, validate } = useFormValidation();
  // Used to defer handleSave after state updates in edit conflict overwrite
  const pendingOverwrite = useRef<boolean | null>(null);

  // Determine which tabs have validation errors
  const tabErrors = (() => {
    const keys = Object.keys(fieldErrors);
    if (keys.length === 0) return { basic: false, quotas: false, questions: false };
    return {
      basic: keys.some((k) => EDITOR_BASIC_TAB_ERROR_KEY_SET.has(k)),
      quotas: keys.some((k) => k === "quotas" || k.startsWith("quotas[")),
      questions: keys.some((k) => k.startsWith("questions[")),
    };
  })();

  const updateField: EditorUpdateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (Object.keys(prev.languages).length === 0) {
        return next;
      }
      // `setForm` callback does not correlate `key` with `value`; keep casts local here.
      if (key === "quotas") {
        next.languages = syncQuotasAcrossLanguages(prev.languages, value as EditorFormState["quotas"]);
      } else if (key === "questions") {
        next.languages = syncQuestionsAcrossLanguages(prev.languages, value as EditorFormState["questions"]);
      }
      return next;
    });
  };

  const mapEditorError = (_field: string, msg: string) => {
    switch (msg) {
      case "dateInverted":
        return t("errors.dateInverted");
      case "registrationDateInverted":
        return t("errors.registrationDateInverted");
      case "dateMissing":
        return t("errors.dateMissing");
      case "endDateWithoutDate":
        return t("errors.endDateWithoutDate");
      case "registrationDateIncomplete":
        return t("errors.registrationDateIncomplete");
      default:
        if (/regex|pattern/i.test(msg)) return t("errors.invalidSlug");
        if (/too.*small|at least|>=\s*1/i.test(msg)) return t("errors.required");
        if (/too.*big|at most/i.test(msg)) return t("errors.tooLong");
        return t("errors.required");
    }
  };

  const handleSave = async (asDraft: boolean) => {
    setError(null);
    setSuccess(null);

    const valid = validate(editorSchema, editorValidationPayload(form), mapEditorError);
    if (!valid) {
      setError(t("saveInvalid"));
      return;
    }

    setSubmitting(true);
    try {
      const body = buildEventUpdateBody(form, asDraft);

      if (effectiveIsNew) {
        const result = await createEventAction(body);
        if (result?.serverError) {
          setError(result.serverError);
        } else if (result?.validationErrors) {
          console.error("Validation errors:", result.validationErrors);
          setError(t("saveInvalid"));
        } else if (result?.data) {
          router.push(`/admin/edit/${result.data.id}`);
        } else {
          setError(t("saveFailed"));
        }
      } else if (savedEvent) {
        const result = await updateEventAction({
          eventId: savedEvent.id,
          body: { ...body, updatedAt: savedEvent.updatedAt },
        });
        if (result?.serverError) {
          setError(result.serverError);
        } else if (result?.validationErrors) {
          console.error("Validation errors:", result.validationErrors);
          setError(t("saveInvalid"));
        } else if (result?.data && "editConflict" in result.data) {
          setEditConflict({
            updatedAt: result.data.updatedAt ?? new Date(),
            deletedQuotas: result.data.deletedQuotas ?? [],
            deletedQuestions: result.data.deletedQuestions ?? [],
          });
        } else if (result?.data && "wouldMoveToQueue" in result.data) {
          setMoveToQueueWarning({
            count: result.data.count ?? 0,
            draft: asDraft,
          });
        } else if (result?.data && "id" in result.data) {
          const eventData = result.data;
          setSavedEvent(eventData);
          setForm((prev) => ({ ...prev, draft: eventData.draft }));
          setSuccess(t("saveSuccess"));
        } else {
          setError(t("saveFailed"));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  // Deferred save after edit conflict overwrite (waits for React to commit the state updates)
  useEffect(() => {
    if (pendingOverwrite.current !== null) {
      const draft = pendingOverwrite.current;
      pendingOverwrite.current = null;
      handleSave(draft);
    }
  }, [form, savedEvent]);

  return (
    <>
      <nav className="mb-4 flex items-center gap-2">
        <Link href="/admin" className="text-sm text-brand-600 hover:underline">
          {"\u2190 " + t("back")}
        </Link>
        <span className="ml-auto flex items-center gap-2">
          {form.draft ? (
            <Badge variant="secondary">{t("statusDraft")}</Badge>
          ) : (
            <>
              <Badge variant="success">{t("statusPublished")}</Badge>
              <Link href={`/events/${form.slug}`} className="text-sm text-brand-600 hover:underline" target="_blank">
                {t("viewEvent") + " \u2197"}
              </Link>
            </>
          )}
        </span>
      </nav>

      <h1 className="mb-4 text-2xl font-bold">{effectiveIsNew ? t("titleNew") : t("titleEdit")}</h1>

      {readOnly && (
        <Alert variant="info" className="mb-4">
          {t("readOnly")}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}

      {/* Edit conflict dialog */}
      {editConflict && (
        <Alert variant="danger" className="mb-4">
          <p className="mb-2 font-semibold">{t("editConflict.title")}</p>
          <p className="mb-3 text-sm">{t("editConflict.info")}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="small" onClick={() => setEditConflict(null)}>
              {t("editConflict.cancel")}
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                setEditConflict(null);
                router.refresh();
              }}
            >
              {t("editConflict.revert")}
            </Button>
            <Button
              variant="danger"
              size="small"
              onClick={() => {
                // Accept the server's updatedAt and re-create deleted items without IDs
                setForm((prev) => ({
                  ...prev,
                  quotas: prev.quotas.map((q) =>
                    q.id && editConflict.deletedQuotas.includes(q.id) ? { ...q, id: undefined } : q,
                  ),
                  questions: prev.questions.map((q) =>
                    q.id && editConflict.deletedQuestions.includes(q.id) ? { ...q, id: undefined } : q,
                  ),
                }));
                setSavedEvent((prev) =>
                  prev
                    ? {
                        ...prev,
                        updatedAt: new Date(editConflict.updatedAt),
                      }
                    : prev,
                );
                setEditConflict(null);
                // Defer save until React commits the state updates above
                pendingOverwrite.current = form.draft;
              }}
            >
              {t("editConflict.overwrite")}
            </Button>
          </div>
        </Alert>
      )}

      {/* Move to queue warning */}
      {moveToQueueWarning && (
        <Alert variant="danger" className="mb-4">
          <p className="mb-2 font-semibold">{t("moveToQueue.title")}</p>
          <p className="mb-3 text-sm">{t("moveToQueue.info", { count: moveToQueueWarning.count })}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="small" onClick={() => setMoveToQueueWarning(null)}>
              {t("moveToQueue.cancel")}
            </Button>
            <Button
              variant="danger"
              size="small"
              disabled={submitting}
              onClick={async () => {
                const draft = moveToQueueWarning.draft;
                setMoveToQueueWarning(null);
                setSubmitting(true);
                setError(null);
                if (!savedEvent) return;
                try {
                  const result = await updateEventAction({
                    eventId: savedEvent.id,
                    body: {
                      ...buildEventUpdateBody(form, draft),
                      moveSignupsToQueue: true,
                      updatedAt: savedEvent.updatedAt,
                    },
                  });
                  if (result?.serverError) {
                    setError(result.serverError);
                  } else if (result?.data && "id" in result.data) {
                    const eventData = result.data;
                    setSavedEvent(eventData);
                    setForm((prev) => ({ ...prev, draft: eventData.draft }));
                    setSuccess(t("saveSuccess"));
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : t("saveFailed"));
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {t("moveToQueue.proceed")}
            </Button>
          </div>
        </Alert>
      )}

      <LanguageManager
        form={form}
        updateField={updateField}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        readOnly={readOnly}
      />

      <Tabs.Root defaultValue="basic">
        <Tabs.List>
          <Tabs.Tab value="basic">
            <TabWithErrorDot label={t("tabs.basic")} show={tabErrors.basic} />
          </Tabs.Tab>
          <Tabs.Tab value="quotas">
            <TabWithErrorDot label={t("tabs.quotas")} show={tabErrors.quotas} />
          </Tabs.Tab>
          <Tabs.Tab value="questions">
            <TabWithErrorDot label={t("tabs.questions")} show={tabErrors.questions} />
          </Tabs.Tab>
          <Tabs.Tab value="emails">{t("tabs.emails")}</Tabs.Tab>
          <Tabs.Tab value="preview">{t("tabs.preview")}</Tabs.Tab>
          {!readOnly && <Tabs.Tab value="signups">{t("tabs.signups")}</Tabs.Tab>}
          {!effectiveIsNew && savedEvent && <Tabs.Tab value="editors">{t("tabs.editors")}</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="basic">
          <BasicDetailsTab
            form={form}
            updateField={updateField}
            fieldErrors={fieldErrors}
            selectedLanguage={selectedLanguage}
            categories={categories}
            eventId={savedEvent?.id}
            isNew={effectiveIsNew}
            readOnly={readOnly}
          />
        </Tabs.Panel>
        <Tabs.Panel value="quotas">
          <QuotasTab
            form={form}
            updateField={updateField}
            fieldErrors={fieldErrors}
            selectedLanguage={selectedLanguage}
            readOnly={readOnly}
          />
        </Tabs.Panel>
        <Tabs.Panel value="questions">
          <QuestionsTab
            form={form}
            updateField={updateField}
            fieldErrors={fieldErrors}
            selectedLanguage={selectedLanguage}
            readOnly={readOnly}
          />
        </Tabs.Panel>
        <Tabs.Panel value="emails">
          <EmailsTab
            form={form}
            updateField={updateField}
            fieldErrors={fieldErrors}
            selectedLanguage={selectedLanguage}
            readOnly={readOnly}
          />
        </Tabs.Panel>
        <Tabs.Panel value="preview">
          <PreviewTab form={form} />
        </Tabs.Panel>
        {!readOnly && (
          <Tabs.Panel value="signups">
            <SignupsTab savedEvent={savedEvent} onEventChange={setSavedEvent} />
          </Tabs.Panel>
        )}
        {!effectiveIsNew && savedEvent && (
          <Tabs.Panel value="editors">
            <EditorsTab eventId={savedEvent.id} initialEditors={editors} readOnly={readOnly} />
          </Tabs.Panel>
        )}
      </Tabs.Root>

      {/* Save buttons */}
      {!readOnly && (
        <>
          <hr className="my-4 border-gray-200" />
          <nav className="flex gap-2">
            {effectiveIsNew ? (
              <>
                <Button variant="secondary" disabled={submitting} loading={submitting} onClick={() => handleSave(true)}>
                  {t("saveDraft")}
                </Button>
                <Button variant="primary" disabled={submitting} loading={submitting} onClick={() => handleSave(false)}>
                  {t("publish")}
                </Button>
              </>
            ) : (
              <>
                {!form.draft && (
                  <Button variant="outline" disabled={submitting} onClick={() => handleSave(true)}>
                    {t("convertToDraft")}
                  </Button>
                )}
                <Button
                  variant="primary"
                  disabled={submitting}
                  loading={submitting}
                  onClick={() => handleSave(form.draft)}
                >
                  {t("saveChanges")}
                </Button>
                {form.draft && (
                  <Button variant="success" disabled={submitting} onClick={() => handleSave(false)}>
                    {t("publish")}
                  </Button>
                )}
              </>
            )}
          </nav>
        </>
      )}
    </>
  );
}
