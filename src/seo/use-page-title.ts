import { useEffect } from "react";

/** Keeps the tab title (and GA4's page_title) right after client-side navigation. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
