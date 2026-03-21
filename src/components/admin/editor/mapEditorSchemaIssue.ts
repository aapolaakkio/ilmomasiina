/** Map Zod / editor schema issue codes to localized strings (`editor.*` namespace). */
export function mapEditorSchemaIssue(msg: string, t: (key: string) => string) {
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
}
