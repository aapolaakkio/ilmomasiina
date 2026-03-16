import { useTranslations } from "next-intl";

import { Field, inputClassName } from "@/components/ui/Field";

import LocalizedIndicator from "./LocalizedIndicator";
import type { EditorTabProps } from "./types";
import { getLocalizedValue, setLocalizedValue } from "./types";

export default function EmailsTab({ form, updateField, selectedLanguage, readOnly }: EditorTabProps) {
  const t = useTranslations("editor");
  const isDefaultLang = selectedLanguage === form.defaultLanguage || !form.languages[selectedLanguage];

  return (
    <div>
      <Field.Root>
        <Field.Label htmlFor="editor-verificationEmail">
          {t("emails.verificationEmail")}
          <LocalizedIndicator />
        </Field.Label>
        <textarea
          id="editor-verificationEmail"
          className={inputClassName}
          rows={8}
          disabled={readOnly}
          value={getLocalizedValue(form, "verificationEmail", selectedLanguage)}
          onChange={(e) => setLocalizedValue(form, updateField, "verificationEmail", e.target.value, selectedLanguage)}
          placeholder={!isDefaultLang ? form.verificationEmail : undefined}
        />
      </Field.Root>
    </div>
  );
}
