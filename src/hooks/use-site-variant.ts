import { useLocation } from "react-router-dom";

export type SiteVariant = "default" | "student";

export function useSiteVariant(): SiteVariant {
  const { pathname } = useLocation();
  return pathname.startsWith("/students") ? "student" : "default";
}

export function tripPath(slug: string, variant: SiteVariant = "default"): string {
  return variant === "student" ? `/students/${slug}` : `/${slug}`;
}

export function squadPath(sub: string = "", variant: SiteVariant = "default"): string {
  const base = variant === "student" ? "/students/squad-leader" : "/squad-leader";
  if (!sub) return base;
  return `${base}/${sub.replace(/^\//, "")}`;
}

export function homePath(variant: SiteVariant = "default"): string {
  return variant === "student" ? "/students" : "/";
}
