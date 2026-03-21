"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createEventAction } from "@/actions/createEvent";
import { updateEventAction } from "@/actions/updateEvent";
import { Link, useRouter } from "@/i18n/navigation";
import type { UserID } from "@/db/schema";
import type { AdminEventResponse } from "@/db/zod";
import { firstAmongHookErrors } from "@/lib/safeActionHook";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";

import BasicDetailsTab from "./editor/BasicDetailsTab";
import { applySavedAdminEventToEditor } from "./editor/applySavedAdminEvent";
import { buildEventUpdateBody } from "./editor/buildEventUpdateBody";
import { editorTabErrors, editorSchema } from "./editor/editorSchema";
import { EditorEditConflictAlert } from "./editor/EditorEditConflictAlert";
import { EditorMoveToQueueAlert } from "./editor/EditorMoveToQueueAlert";
import EditorsTab from "./editor/EditorsTab";
import EmailsTab from "./editor/EmailsTab";
import { flattenRHFErrors } from "./editor/flattenRHFErrors";
import { createInitialEditorSession } from "./editor/initialEditorForm";
import LanguageManager from "./editor/LanguageManager";
import { mapEditorSchemaIssue } from "./editor/mapEditorSchemaIssue";
import PreviewTab from "./editor/PreviewTab";
import QuestionsTab from "./editor/QuestionsTab";
import QuotasTab from "./editor/QuotasTab";
import { isSaveErrorResult, isSuccessfulPlainEventSavePayload } from "./editor/saveResultHelpers";
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

  const {
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<EditorFormState>({
    resolver: zodResolver(editorSchema) as unknown as Resolver<EditorFormState>,
    defaultValues: mountSeed().form,
  });

  const form = watch();

  const [selectedLanguage, setSelectedLanguage] = useState(() => mountSeed().selectedLanguage);
  const [localError, setLocalError] = useState<string | null>(null);
  const [savedEvent, setSavedEvent] = useState(initialEvent);
  const [editConflict, setEditConflict] = useState<EditorEditConflictState | null>(null);
  const [moveToQueueWarning, setMoveToQueueWarning] = useState<{
    count: number;
    draft: boolean;
  } | null>(null);

  const fieldErrors = flattenRHFErrors(errors, (msg) => mapEditorSchemaIssue(msg, t));

  const {
    executeAsync: runCreate,
    status: createEventSaveStatus,
    result: createSaveHookResult,
    reset: resetCreateSave,
  } = useAction(createEventAction);
  const {
    executeAsync: runUpdate,
    status: updateEventSaveStatus,
    result: updateSaveHookResult,
    reset: resetUpdateSave,
  } = useAction(updateEventAction);
  const activeSaveStatus = effectiveIsNew ? createEventSaveStatus : updateEventSaveStatus;
  const activeSaveResult = effectiveIsNew ? createSaveHookResult : updateSaveHookResult;

  const invalidLabel = t("saveInvalid");
  const saveFailedLabel = t("saveFailed");
  const saveHookError = firstAmongHookErrors([
    {
      status: activeSaveStatus,
      result: activeSaveResult,
      fallback: saveFailedLabel,
      validationFallback: invalidLabel,
    },
  ]);
  const displayError = localError ?? saveHookError;

  const saveSuccessMessage =
    updateEventSaveStatus === "hasSucceeded" && isSuccessfulPlainEventSavePayload(updateSaveHookResult?.data)
      ? t("saveSuccess")
      : null;

  const pendingOverwrite = useRef<boolean | null>(null);

  const tabErrors = editorTabErrors(fieldErrors);

  const updateField: EditorUpdateField = (key, value) => {
    (setValue as (name: string, value: unknown) => void)(key, value);
    if (key === "quotas") {
      const languages = getValues("languages");
      setValue("languages", syncQuotasAcrossLanguages(languages, value as EditorFormState["quotas"]));
    } else if (key === "questions") {
      const languages = getValues("languages");
      setValue("languages", syncQuestionsAcrossLanguages(languages, value as EditorFormState["questions"]));
    }
  };

  const editorTabProps = {
    form,
    updateField,
    fieldErrors,
    selectedLanguage,
    readOnly,
  };

  const handleSaveRef = useRef<(asDraft: boolean) => Promise<void>>(async () => {});

  async function handleSave(asDraft: boolean) {
    setLocalError(null);
    resetCreateSave();
    resetUpdateSave();

    const valid = await trigger();
    if (!valid) {
      setLocalError(invalidLabel);
      return;
    }

    try {
      const body = buildEventUpdateBody(getValues(), asDraft);

      if (effectiveIsNew) {
        const result = await runCreate(body);
        if (isSaveErrorResult(result)) {
          return;
        }
        if (result?.data) {
          router.push(`/admin/edit/${result.data.id}`);
        } else {
          setLocalError(saveFailedLabel);
        }
      } else if (savedEvent) {
        const result = await runUpdate({
          eventId: savedEvent.id,
          body: { ...body, updatedAt: savedEvent.updatedAt },
        });
        if (isSaveErrorResult(result)) {
          return;
        }
        if (result?.data && "editConflict" in result.data) {
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
          applySavedAdminEventToEditor(result.data, setSavedEvent, setValue);
        } else {
          setLocalError(saveFailedLabel);
        }
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : saveFailedLabel);
    }
  }

  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (pendingOverwrite.current !== null) {
      const draft = pendingOverwrite.current;
      pendingOverwrite.current = null;
      void handleSaveRef.current(draft);
    }
  }, [savedEvent]);

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

      <Alert
        variant={displayError ? "danger" : "success"}
        className={`mb-4 ${(displayError ?? saveSuccessMessage) ? "visible" : "invisible"}`}
      >
        {displayError ?? saveSuccessMessage ?? "\u00A0"}
      </Alert>

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
            const quotas = getValues("quotas").map((q) =>
              q.id && conflict.deletedQuotas.includes(q.id) ? { ...q, id: undefined } : q,
            );
            const questions = getValues("questions").map((q) =>
              q.id && conflict.deletedQuestions.includes(q.id) ? { ...q, id: undefined } : q,
            );
            setValue("quotas", quotas);
            setValue("questions", questions);
            setSavedEvent((prev) => (prev ? { ...prev, updatedAt: conflict.updatedAt } : prev));
            setEditConflict(null);
            pendingOverwrite.current = getValues("draft");
          }}
        />
      )}

      {moveToQueueWarning && (
        <EditorMoveToQueueAlert
          labels={moveToQueueLabels}
          proceedActionStatus={activeSaveStatus}
          onCancel={() => setMoveToQueueWarning(null)}
          onProceed={async () => {
            const draft = moveToQueueWarning.draft;
            setMoveToQueueWarning(null);
            setLocalError(null);
            resetCreateSave();
            resetUpdateSave();
            if (!savedEvent) return;
            try {
              const result = await runUpdate({
                eventId: savedEvent.id,
                body: {
                  ...buildEventUpdateBody(getValues(), draft),
                  moveSignupsToQueue: true,
                  updatedAt: savedEvent.updatedAt,
                },
              });
              if (isSaveErrorResult(result)) {
                return;
              }
              if (result?.data && "id" in result.data) {
                applySavedAdminEventToEditor(result.data, setSavedEvent, setValue);
              } else {
                setLocalError(saveFailedLabel);
              }
            } catch (err) {
              setLocalError(err instanceof Error ? err.message : saveFailedLabel);
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
                <Button variant="secondary" actionStatus={activeSaveStatus} onClick={() => void handleSave(true)}>
                  {t("saveDraft")}
                </Button>
                <Button variant="primary" actionStatus={activeSaveStatus} onClick={() => void handleSave(false)}>
                  {t("publish")}
                </Button>
              </>
            ) : (
              <>
                {!form.draft && (
                  <Button variant="outline" actionStatus={activeSaveStatus} onClick={() => void handleSave(true)}>
                    {t("convertToDraft")}
                  </Button>
                )}
                <Button variant="primary" actionStatus={activeSaveStatus} onClick={() => void handleSave(form.draft)}>
                  {t("saveChanges")}
                </Button>
                {form.draft && (
                  <Button variant="success" actionStatus={activeSaveStatus} onClick={() => void handleSave(false)}>
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
