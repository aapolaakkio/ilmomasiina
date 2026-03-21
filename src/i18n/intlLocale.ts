/** BCP 47 locale for `Intl` (Finland region for date/number conventions). */
export function appLocaleToBcp47(appLocale: string) {
  switch (appLocale) {
    case "en":
      return "en-FI";
    case "sv":
      return "sv-FI";
    case "fi":
    default:
      return "fi-FI";
  }
}
