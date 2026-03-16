"use client";

import { useTranslations } from "next-intl";

import type { AdminEventLanguage } from "@/models";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import { createEmptyLanguageVersion, type EditorFormState } from "./types";

const KNOWN_LANGUAGES = ["fi", "en"] as const;

type Props = {
  form: EditorFormState;
  updateField: <K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
};

export default function LanguageManager({ form, updateField, selectedLanguage, onSelectLanguage }: Props) {
  const t = useTranslations("editor");

  const addLanguage = (lang: string) => {
    const newVersion = createEmptyLanguageVersion(form);
    updateField("languages", { ...form.languages, [lang]: newVersion });
    // If no default language is set, set it to the first language
    if (!form.defaultLanguage) {
      updateField("defaultLanguage", lang);
    }
    onSelectLanguage(lang);
  };

  const removeLanguage = (lang: string) => {
    const { [lang]: _, ...rest } = form.languages;
    updateField("languages", rest);
    if (selectedLanguage === lang) {
      onSelectLanguage(form.defaultLanguage);
    }
  };

  const setDefaultLanguage = (newDefault: string) => {
    // Swap: current top-level → language version, target language version → top-level
    const oldDefault = form.defaultLanguage;

    // Package current top-level fields as a language version
    const oldDefaultVersion: AdminEventLanguage = {
      title: form.title,
      description: form.description || null,
      price: form.price || null,
      location: form.location || null,
      webpageUrl: form.webpageUrl || null,
      verificationEmail: form.verificationEmail || null,
      quotas: form.quotas.map((q) => ({ title: q.title })),
      questions: form.questions.map((q) => ({
        question: q.question,
        options: q.options ? [...q.options] : null,
      })),
    };

    // Get the new default's language version
    const newDefaultVersion = form.languages[newDefault];
    if (!newDefaultVersion) return;

    // Copy new default version fields to top-level
    const newLanguages = { ...form.languages };
    delete newLanguages[newDefault];
    if (oldDefault) {
      newLanguages[oldDefault] = oldDefaultVersion;
    }

    updateField("title", newDefaultVersion.title || form.title);
    updateField("description", (newDefaultVersion.description ?? form.description) || "");
    updateField("price", (newDefaultVersion.price ?? form.price) || "");
    updateField("location", (newDefaultVersion.location ?? form.location) || "");
    updateField("webpageUrl", (newDefaultVersion.webpageUrl ?? form.webpageUrl) || "");
    updateField("verificationEmail", (newDefaultVersion.verificationEmail ?? form.verificationEmail) || "");

    // Update quota/question titles from the new default language
    updateField(
      "quotas",
      form.quotas.map((q, i) => ({
        ...q,
        title: newDefaultVersion.quotas?.[i]?.title || q.title,
      })),
    );
    updateField(
      "questions",
      form.questions.map((q, i) => ({
        ...q,
        question: newDefaultVersion.questions?.[i]?.question || q.question,
        options: newDefaultVersion.questions?.[i]?.options || q.options,
      })),
    );

    updateField("languages", newLanguages);
    updateField("defaultLanguage", newDefault);
    onSelectLanguage(newDefault);
  };

  const hasLanguageVersions = Object.keys(form.languages).length > 0 || form.defaultLanguage;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{t("languages.title")}</h3>
      <div className="flex flex-wrap items-center gap-2">
        {KNOWN_LANGUAGES.map((lang) => {
          const isDefault = form.defaultLanguage === lang;
          const hasVersion = lang in form.languages;
          const isSelected = selectedLanguage === lang;
          const isActive = isDefault || hasVersion;

          if (!isActive) {
            return (
              <Button key={lang} variant="outline" size="small" onClick={() => addLanguage(lang)}>
                + {lang.toUpperCase()}
              </Button>
            );
          }

          return (
            <div key={lang} className="flex items-center gap-1">
              <Button variant={isSelected ? "primary" : "outline"} size="small" onClick={() => onSelectLanguage(lang)}>
                {lang.toUpperCase()}
                {isDefault && (
                  <Badge variant="info" className="ml-1">
                    {t("languages.default")}
                  </Badge>
                )}
              </Button>
              {!isDefault && hasVersion && (
                <>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setDefaultLanguage(lang)}
                    title={t("languages.setDefault")}
                  >
                    &#9733;
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => removeLanguage(lang)}
                    title={t("languages.remove")}
                  >
                    &times;
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>
      {!hasLanguageVersions && <p className="mt-2 text-xs text-gray-500">{t("languages.hint")}</p>}
    </div>
  );
}
