import { redirect } from "next/navigation";

interface LegacyCollaborationPageProps {
  params: Promise<{ code: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Legacy route redirect: /[code]/[token] -> /f/[code]/[token]
 *
 * Preserves query params for stable old share links.
 */
export default async function LegacyCollaborationPage({
  params,
  searchParams,
}: LegacyCollaborationPageProps) {
  const { code, token } = await params;
  const search = await searchParams;

  // Build query string from search params
  const queryString = Object.entries(search)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join("&");
      }
      return value ? `${encodeURIComponent(key)}=${encodeURIComponent(value)}` : "";
    })
    .filter(Boolean)
    .join("&");

  const newUrl = `/f/${code}/${token}${queryString ? `?${queryString}` : ""}`;
  redirect(newUrl);
}
