/**
 * @file Google Analytics 4 integration
 */

declare global {
  interface Window {
    gtag?: (command: string, ...args: any[]) => void;
    dataLayer?: any[];
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

/**
 * Initialize GA4
 */
export function initGA() {
  if (!GA_MEASUREMENT_ID) {
    console.warn("GA4 Measurement ID not configured");
    return;
  }

  // Load gtag.js script
  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer!.push(arguments);
    };

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
  });
}

/**
 * Track page view
 */
export function trackPageView(url: string) {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

/**
 * Track custom event
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag("event", eventName, params);
}

/**
 * Track feedback submission (conversion event)
 */
export function trackFeedbackSubmit(params: {
  rating: number;
  has_photo: boolean;
  tour_id?: string;
  language: string;
}) {
  trackEvent("feedback_submit", {
    ...params,
    event_category: "engagement",
    event_label: "feedback_form",
    value: params.rating,
  });

  // Also track as conversion
  trackEvent("conversion", {
    send_to: `${GA_MEASUREMENT_ID}/feedback_submit`,
  });
}

/**
 * Track tour view
 */
export function trackTourView(tourId: string, tourName: string) {
  trackEvent("view_item", {
    event_category: "engagement",
    event_label: "tour_view",
    item_id: tourId,
    item_name: tourName,
  });
}

/**
 * Track review read
 */
export function trackReviewRead(reviewId: string, rating: number) {
  trackEvent("view_item", {
    event_category: "engagement",
    event_label: "review_read",
    item_id: reviewId,
    value: rating,
  });
}

/**
 * Track contact action
 */
export function trackContact(method: "whatsapp" | "email" | "facebook" | "zalo") {
  trackEvent("contact", {
    event_category: "engagement",
    event_label: method,
    method,
  });
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string) {
  trackEvent("search", {
    search_term: searchTerm,
    event_category: "engagement",
  });
}

/**
 * Track share action
 */
export function trackShare(method: string, contentType: string, contentId: string) {
  trackEvent("share", {
    method,
    content_type: contentType,
    content_id: contentId,
    event_category: "social",
  });
}
