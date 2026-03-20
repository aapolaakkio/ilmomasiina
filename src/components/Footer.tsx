import { env } from "@/env";

export default function Footer() {
  const gdprText = env.NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT;
  const gdprLink = env.NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK;
  const homeText = env.NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT;
  const homeLink = env.NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK;

  if (!gdprText && !homeText) return null;

  return (
    <footer className="border-t border-gray-200 py-4 text-center text-sm text-gray-500">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-4 px-4">
        {gdprText && gdprLink && (
          <a href={gdprLink} className="text-gray-500 hover:text-gray-700 hover:underline">
            {gdprText}
          </a>
        )}
        {homeText && homeLink && (
          <a href={homeLink} className="text-gray-500 hover:text-gray-700 hover:underline">
            {homeText}
          </a>
        )}
      </div>
    </footer>
  );
}
