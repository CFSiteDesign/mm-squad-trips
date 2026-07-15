// utils/gtmTracker.ts
// Ported from frontend/utils/gtmTracker.ts, minus TikTok twin-event mirroring —
// no TikTok Pixel is provisioned for this site, so that logic was left out
// rather than shipped as dead code.

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * GA4 recommends clearing the previous ecommerce object before each ecommerce
 * event: `dataLayer.push({ ecommerce: null })`. Pure clear — pushes no event.
 */
export const gtmClearEcommerce = () => {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
  }
};

export const gtmPushEvent = (eventName: string, eventData: Record<string, unknown> = {}) => {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...eventData });
  }
};

export const deferGtmPushEvent = (eventName: string, eventData: Record<string, unknown> = {}) => {
  if (typeof window === "undefined") {
    gtmPushEvent(eventName, eventData);
    return;
  }

  const send = () => gtmPushEvent(eventName, eventData);
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(send, { timeout: 3000 });
    return;
  }

  window.setTimeout(send, 0);
};
