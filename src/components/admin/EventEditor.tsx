"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import { createEventAction } from "@/actions/createEvent";
import { updateEventAction } from "@/actions/updateEvent";
import { Link, useRouter } from "@/i18n/navigation";
import type { UserID } from "@/db/schema";
import type { AdminEventResponse } from "@/db/zod";
import { useFormValidation } from "@/lib/useFormValidation";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";

import BasicDetailsTab from "./editor/BasicDetailsTab";
import { applySavedAdminEventToEditor } from "./editor/applySavedAdminEvent";
import { buildEventUpdateBody } from "./editor/buildEventUpdateBody";
import { editorTabErrors, editorSchema, editorValidationPayload } from "./editor/editorSchema";
import { EditorEditConflictAlert } from "./editor/EditorEditConflictAlert";
import { EditorMoveToQueueAlert } from "./editor/EditorMoveToQueueAlert";
import EditorsTab from "./editor/EditorsTab";
import EmailsTab from "./editor/EmailsTab";
import { createInitialEditorSession } from "./editor/initialEditorForm";
import LanguageManager from "./editor/LanguageManager";
import { mapEditorSchemaIssue } from "./editor/mapEditorSchemaIssue";
import PreviewTab from "./editor/PreviewTab";
import QuestionsTab from "./editor/QuestionsTab";
import QuotasTab from "./editor/QuotasTab";
import { consumeSaveErrorResult } from "./editor/saveResultHelpers";
import SignupsTab from "./editor/SignupsTab";
import { syncQuestionsAcrossLanguages, syncQuotasAcrossLanguages } from "./editor/syncLanguageVersions";
import { TabWithErrorDot } from "./editor/TabWithErrorDot";
import { type EditorEditConflictState, type EditorFormState, type EditorUpdateField } from "./editor/types";

type Props = {
  event: AdminEventResponse | null;
  isNew: boolean;
  copy?: boolean;
  categories: string[];
  editors: { userId: UserID; email: string }[];
  readOnly?: boolean;
};

export default function EventEditor({ event: initialEvent, isNew, copy, categories, editors, readOnly }: Props) {
  const router = useRouter();
  const t = useTranslations("editor");
  const effectiveIsNew = isNew || !!copy;

  const mountSeedRef = useRef<ReturnType<typeof createInitialEditorSession> | null>(null);
  function mountSeed() {
    if (!mountSeedRef.current) {
      mountSeedRef.current = createInitialEditorSession(initialEvent, copy);
    }
    return mountSeedRef.current;
  }

  const [form, setForm] = useState(() => mountSeed().form);
  const [selectedLanguage, setSelectedLanguage] = useState(() => mountSeed().selectedLanguage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedEvent, setSavedEvent] = useState(initialEvent);
  const [editConflict, setEditConflict] = useState<EditorEditConflictState | null>(null);
  const [moveToQueueWarning, setMoveToQueueWarning] = useState<{
    count: number;
    draft: boolean;
  } | null>(null);
  const { fieldErrors, validate } = useFormValidation();

  /**
   * After edit-conflict overwrite we `setForm` / `setSavedEvent` synchronously, then save on a later
   * commit so `handleSave` reads the updated state. Cleared inside the effect below.
   */
  const pendingOverwrite = useRef<boolean | null>(null);

  const tabErrors = editorTabErrors(fieldErrors);

  const updateField: EditorUpdateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (Object.keys(prev.languages).length === 0) {
        return next;
      }
      if (key === "quotas") {
        next.languages = syncQuotasAcrossLanguages(prev.languages, value as EditorFormState["quotas"]);
      } else if (key === "questions") {
        next.languages = syncQuestionsAcrossLanguages(prev.languages, value as EditorFormState["questions"]);
      }
      return next;
    });
  };

  const editorTabProps = {
    form,
    updateField,
    fieldErrors,
    selectedLanguage,
    readOnly,
  };

  const invalidLabel = t("saveInvalid");

  const handleSaveRef = useRef<(asDraft: boolean) => Promise<void>>(async () => {});

  async function handleSave(asDraft: boolean) {
    setError(null);
    setSuccess(null);

    const valid = validate(editorSchema, editorValidationPayload(form), (_field, msg) => mapEditorSchemaIssue(msg, t));
    if (!valid) {
      setError(invalidLabel);
      return;
    }

    setSubmitting(true);
    try {
      const body = buildEventUpdateBody(form, asDraft);

      if (effectiveIsNew) {
        const result = await createEventAction(body);
        if (consumeSaveErrorResult(result, { invalid: invalidLabel }, setError)) {
          /* handled */
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
        if (consumeSaveErrorResult(result, { invalid: invalidLabel }, setError)) {
          /* handled */
        } else if (result?.data && "editConflict" in result.data) {
          const d = result.data;
          setEditConflict({
            updatedAt: d.updatedAt ?? new Date(),
            deletedQuotas: d.deletedQuotas ?? [],
            deletedQuestions: d.deletedQuestions ?? [],
          });
        } else if (result?.data && "wouldMoveToQueue" in result.data) {
          setMoveToQueueWarning({
            count: result.data.count ?? 0,
            draft: asDraft,
          });
        } else if (result?.data && "id" in result.data) {
          applySavedAdminEventToEditor(result.data, setSavedEvent, setForm);
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
  }

  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (pendingOverwrite.current !== null) {
      const draft = pendingOverwrite.current;
      pendingOverwrite.current = null;
      void handleSaveRef.current(draft);
    }
  }, [form, savedEvent]);

  const editConflictLabels = {
    title: t("editConflict.title"),
    info: t("editConflict.info"),
    cancel: t("editConflict.cancel"),
    revert: t("editConflict.revert"),
    overwrite: t("editConflict.overwrite"),
  };

  const moveToQueueCount = moveToQueueWarning?.count ?? 0;
  const moveToQueueLabels = {
    title: t("moveToQueue.title"),
    info: t("moveToQueue.info", { count: moveToQueueCount }),
    cancel: t("moveToQueue.cancel"),
    proceed: t("moveToQueue.proceed"),
  };

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
              <Link href={`/event/${form.slug}`} className="text-sm text-brand-600 hover:underline" target="_blank">
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

      {editConflict && (
        <EditorEditConflictAlert
          labels={editConflictLabels}
          onCancel={() => setEditConflict(null)}
          onRevert={() => {
            setEditConflict(null);
            router.refresh();
          }}
          onOverwrite={() => {
            const conflict = editConflict;
            setForm((prev) => ({
              ...prev,
              quotas: prev.quotas.map((q) =>
                q.id && conflict.deletedQuotas.includes(q.id) ? { ...q, id: undefined } : q,
              ),
              questions: prev.questions.map((q) =>
                q.id && conflict.deletedQuestions.includes(q.id) ? { ...q, id: undefined } : q,
              ),
            }));
            setSavedEvent((prev) =>
              prev
                ? {
                    ...prev,
                    updatedAt: conflict.updatedAt,
                  }
                : prev,
            );
            setEditConflict(null);
            pendingOverwrite.current = form.draft;
          }}
        />
      )}

      {moveToQueueWarning && (
        <EditorMoveToQueueAlert
          labels={moveToQueueLabels}
          submitting={submitting}
          onCancel={() => setMoveToQueueWarning(null)}
          onProceed={async () => {
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
              if (consumeSaveErrorResult(result, { invalid: invalidLabel }, setError)) {
                /* handled */
              } else if (result?.data && "id" in result.data) {
                applySavedAdminEventToEditor(result.data, setSavedEvent, setForm);
                setSuccess(t("saveSuccess"));
              } else {
                setError(t("saveFailed"));
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : t("saveFailed"));
            } finally {
              setSubmitting(false);
            }
          }}
        />
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
            {...editorTabProps}
            categories={categories}
            eventId={savedEvent?.id}
            isNew={effectiveIsNew}
          />
        </Tabs.Panel>
        <Tabs.Panel value="quotas">
          <QuotasTab {...editorTabProps} />
        </Tabs.Panel>
        <Tabs.Panel value="questions">
          <QuestionsTab {...editorTabProps} />
        </Tabs.Panel>
        <Tabs.Panel value="emails">
          <EmailsTab {...editorTabProps} />
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

      {!readOnly && (
        <>
          <hr className="my-4 border-gray-200" />
          <nav className="flex gap-2">
            {effectiveIsNew ? (
              <>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  loading={submitting}
                  onClick={() => void handleSave(true)}
                >
                  {t("saveDraft")}
                </Button>
                <Button
                  variant="primary"
                  disabled={submitting}
                  loading={submitting}
                  onClick={() => void handleSave(false)}
                >
                  {t("publish")}
                </Button>
              </>
            ) : (
              <>
                {!form.draft && (
                  <Button variant="outline" disabled={submitting} onClick={() => void handleSave(true)}>
                    {t("convertToDraft")}
                  </Button>
                )}
                <Button
                  variant="primary"
                  disabled={submitting}
                  loading={submitting}
                  onClick={() => void handleSave(form.draft)}
                >
                  {t("saveChanges")}
                </Button>
                {form.draft && (
                  <Button variant="success" disabled={submitting} onClick={() => void handleSave(false)}>
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
