import { useTranslations } from "next-intl";

/** Shows a globe icon next to a label to indicate the field is translated per language. */
export default function LocalizedIndicator() {
  const t = useTranslations("editor");
  return (
    <span className="ml-1.5 text-xs font-normal text-gray-400" title={t("localized")}>
      {"\uD83C\uDF10"}
    </span>
  );
}
