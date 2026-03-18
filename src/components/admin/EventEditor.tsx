"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslations } from "next-intl";
import { z } from "zod/v4";

import { createEventAction } from "@/actions/createEvent";
import { updateEventAction } from "@/actions/updateEvent";
import { Link, useRouter } from "@/i18n/navigation";
import { type QuestionID, type QuotaID, PaymentMode } from "@/db/schema";
import type { AdminEventResponse } from "@/db/zod";
import { useFormValidation } from "@/lib/useFormValidation";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";

import type { UserID } from "@/db/schema";

import BasicDetailsTab from "./editor/BasicDetailsTab";
import EditorsTab from "./editor/EditorsTab";
import EmailsTab from "./editor/EmailsTab";
import LanguageManager from "./editor/LanguageManager";
import PreviewTab from "./editor/PreviewTab";
import QuestionsTab from "./editor/QuestionsTab";
import QuotasTab from "./editor/QuotasTab";
import SignupsTab from "./editor/SignupsTab";
import { type EditorFormState, generateKey } from "./editor/types";

type Props = {
  event: AdminEventResponse | null;
  isNew: boolean;
  copy?: boolean;
  categories: string[];
  editors: { userId: UserID; email: string }[];
  readOnly?: boolean;
};

function stripIdsForCopy(event: AdminEventResponse) {
  return {
    ...event,
    title: `Copy: ${event.title}`,
    slug: "",
    draft: true,
    quotas: event.quotas.map((q) => ({ ...q, id: undefined, signups: [] })),
    questions: event.questions.map((q) => ({ ...q, id: undefined })),
  };
}

const optionalDateOrEmpty = z.union([z.string().min(1), z.date(), z.null()]);

const editorSchema = z
  .object({
    title: z.string().min(1).max(255),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9_-]+$/),
    quotas: z
      .array(
        z.object({
          title: z.string().min(1).max(255),
          size: z.nullable(z.number().int().min(1)),
        }),
      )
      .min(1),
    questions: z.array(
      z.object({
        question: z.string().min(1).max(255),
      }),
    ),
    date: optionalDateOrEmpty,
    endDate: optionalDateOrEmpty,
    registrationStartDate: optionalDateOrEmpty,
    registrationEndDate: optionalDateOrEmpty,
  })
  .refine((data) => !data.date || !data.endDate || new Date(data.endDate) >= new Date(data.date), {
    path: ["dateInverted"],
    message: "dateInverted",
  })
  .refine(
    (data) =>
      !data.registrationStartDate ||
      !data.registrationEndDate ||
      new Date(data.registrationEndDate) >= new Date(data.registrationStartDate),
    {
      path: ["registrationDateInverted"],
      message: "registrationDateInverted",
    },
  )
  .refine((data) => data.date || data.registrationStartDate, {
    path: ["dateMissing"],
    message: "dateMissing",
  })
  .refine((data) => !(data.endDate && !data.date), {
    path: ["endDateWithoutDate"],
    message: "endDateWithoutDate",
  })
  .refine(
    (data) =>
      (data.registrationStartDate && data.registrationEndDate) ||
      (!data.registrationStartDate && !data.registrationEndDate),
    {
      path: ["registrationDateIncomplete"],
      message: "registrationDateIncomplete",
    },
  );

export default function EventEditor({ event: initialEvent, isNew, copy, categories, editors, readOnly }: Props) {
  const router = useRouter();
  const t = useTranslations("editor");
  const effectiveIsNew = isNew || !!copy;

  const initial = useMemo((): EditorFormState => {
    if (!initialEvent) {
      return {
        title: "",
        slug: "",
        draft: true,
        listed: true,
        category: "",
        date: "",
        endDate: "",
        registrationStartDate: "",
        registrationEndDate: "",
        openQuotaSize: 0,
        description: "",
        price: "",
        location: "",
        webpageUrl: "",
        signupsPublic: false,
        nameQuestion: true,
        emailQuestion: true,
        payments: PaymentMode.DISABLED,
        defaultLanguage: "",
        languages: {},
        verificationEmail: "",
        quotas: [{ key: generateKey(), title: "", size: null, price: 0 }],
        questions: [],
      };
    }
    const src = copy ? stripIdsForCopy(initialEvent) : initialEvent;
    return {
      title: src.title ?? "",
      slug: src.slug ?? "",
      draft: src.draft ?? true,
      listed: src.listed ?? true,
      category: src.category ?? "",
      date: src.date?.toISOString() ?? "",
      endDate: src.endDate?.toISOString() ?? "",
      registrationStartDate: src.registrationStartDate?.toISOString() ?? "",
      registrationEndDate: src.registrationEndDate?.toISOString() ?? "",
      openQuotaSize: src.openQuotaSize ?? 0,
      description: src.description ?? "",
      price: src.price ?? "",
      location: src.location ?? "",
      webpageUrl: src.webpageUrl ?? "",
      signupsPublic: src.signupsPublic ?? false,
      nameQuestion: src.nameQuestion ?? true,
      emailQuestion: src.emailQuestion ?? true,
      payments: src.payments ?? PaymentMode.DISABLED,
      defaultLanguage: src.defaultLanguage ?? "",
      languages: src.languages ?? {},
      verificationEmail: src.verificationEmail ?? "",
      quotas: src.quotas?.map((q) => ({
        key: generateKey(),
        id: q.id,
        title: q.title,
        size: q.size,
        price: q.price ?? 0,
      })) ?? [{ key: generateKey(), title: "", size: null, price: 0 }],
      questions:
        src.questions?.map((q) => ({
          key: generateKey(),
          id: q.id,
          question: q.question,
          type: q.type,
          required: q.required,
          public: q.public,
          options: q.options,
          prices: q.prices ?? null,
        })) ?? [],
    };
  }, [initialEvent, copy]);

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
  const tabErrors = useMemo(() => {
    const keys = Object.keys(fieldErrors);
    if (keys.length === 0) return { basic: false, quotas: false, questions: false };
    const basicFields = [
      "title",
      "slug",
      "dateInverted",
      "registrationDateInverted",
      "dateMissing",
      "endDateWithoutDate",
      "registrationDateIncomplete",
    ];
    return {
      basic: keys.some((k) => basicFields.includes(k)),
      quotas: keys.some((k) => k === "quotas" || k.startsWith("quotas[")),
      questions: keys.some((k) => k.startsWith("questions[")),
    };
  }, [fieldErrors]);

  const updateField = useCallback(<K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      // Keep language version arrays in sync when quotas/questions change
      if ((key === "quotas" || key === "questions") && Object.keys(prev.languages).length > 0) {
        const syncedLanguages = { ...prev.languages };
        for (const [langKey, langVersion] of Object.entries(syncedLanguages)) {
          const synced = { ...langVersion };
          if (key === "quotas") {
            const newQuotas = value as EditorFormState["quotas"];
            // Resize: keep existing, add empty for new, trim excess
            synced.quotas = newQuotas.map((_, i) => langVersion.quotas?.[i] ?? { title: "" });
          }
          if (key === "questions") {
            const newQuestions = value as EditorFormState["questions"];
            synced.questions = newQuestions.map((q, i) => {
              const existing = langVersion.questions?.[i];
              if (existing) {
                // Resize options if they changed
                if (q.options && existing.options && q.options.length !== existing.options.length) {
                  return {
                    ...existing,
                    options: q.options.map((_, j) => existing.options?.[j] ?? ""),
                  };
                }
                if (q.options && !existing.options) {
                  return { ...existing, options: q.options.map(() => "") };
                }
                if (!q.options) {
                  return { ...existing, options: null };
                }
                return existing;
              }
              return {
                question: "",
                options: q.options ? q.options.map(() => "") : null,
              };
            });
          }
          syncedLanguages[langKey] = synced;
        }
        next.languages = syncedLanguages;
      }

      return next;
    });
  }, []);

  const mapEditorError = useCallback(
    (field: string, msg: string) => {
      if (msg === "dateInverted") return t("errors.dateInverted");
      if (msg === "registrationDateInverted") return t("errors.registrationDateInverted");
      if (msg === "dateMissing") return t("errors.dateMissing");
      if (msg === "endDateWithoutDate") return t("errors.endDateWithoutDate");
      if (msg === "registrationDateIncomplete") return t("errors.registrationDateIncomplete");
      if (/regex|pattern/i.test(msg)) return t("errors.invalidSlug");
      if (/too.*small|at least|>=\s*1/i.test(msg)) return t("errors.required");
      if (/too.*big|at most/i.test(msg)) return t("errors.tooLong");
      return t("errors.required");
    },
    [t],
  );

  /** Converts the editor form state into the API request body. */
  function buildBody(asDraft: boolean) {
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

  const handleSave = useCallback(
    async (asDraft: boolean) => {
      setError(null);
      setSuccess(null);

      const validationData = {
        title: form.title,
        slug: form.slug,
        quotas: form.quotas.map((q) => ({ title: q.title, size: q.size })),
        questions: form.questions.map((q) => ({ question: q.question })),
        date: form.date || null,
        endDate: form.endDate || null,
        registrationStartDate: form.registrationStartDate || null,
        registrationEndDate: form.registrationEndDate || null,
      };

      const valid = validate(editorSchema, validationData, mapEditorError);
      if (!valid) {
        setError(t("saveInvalid"));
        return;
      }

      setSubmitting(true);
      try {
        const body = buildBody(asDraft);

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
            const conflict = result.data as {
              updatedAt: Date;
              deletedQuotas: QuotaID[];
              deletedQuestions: QuestionID[];
            };
            setEditConflict(conflict);
          } else if (result?.data && "wouldMoveToQueue" in result.data) {
            const warning = result.data;
            setMoveToQueueWarning({
              count: warning.count ?? 0,
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
    },
    [form, effectiveIsNew, savedEvent, router, t, validate, mapEditorError],
  );

  // Deferred save after edit conflict overwrite (waits for React to commit the state updates)
  useEffect(() => {
    if (pendingOverwrite.current !== null) {
      const draft = pendingOverwrite.current;
      pendingOverwrite.current = null;
      handleSave(draft);
    }
  }, [form, savedEvent, handleSave]);

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
                      ...buildBody(draft),
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
            {t("tabs.basic")}
            {tabErrors.basic && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500" />}
          </Tabs.Tab>
          <Tabs.Tab value="quotas">
            {t("tabs.quotas")}
            {tabErrors.quotas && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500" />}
          </Tabs.Tab>
          <Tabs.Tab value="questions">
            {t("tabs.questions")}
            {tabErrors.questions && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500" />}
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
