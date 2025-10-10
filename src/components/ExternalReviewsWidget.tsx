"use client";

import { useEffect } from "react";

/**
 * External Reviews Widget Component
 *
 * Embeds Tripadvisor and Google Reviews widgets on the reviews page
 *
 * To configure:
 * 1. Get your Tripadvisor widget code from: https://www.tripadvisor.com/Owners
 * 2. Get your Google Reviews widget from: https://developers.google.com/my-business/content/review-snippets
 * 3. Replace the placeholder IDs below with your actual IDs
 */

export function TripadvisorWidget() {
  useEffect(() => {
    // Load Tripadvisor widget script
    const script = document.createElement("script");
    script.src = "https://www.jungscharwuerenlos.ch/tripadvisor-widgets/widgetloader.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="tripadvisor-widget-container">
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">Tripadvisor Reviews</h3>
        <p className="text-sm text-gray-600 mb-4">
          See what travelers are saying about our tours on Tripadvisor
        </p>
      </div>

      {/*
        Replace this placeholder with your actual Tripadvisor widget code

        Steps to get your widget:
        1. Go to https://www.tripadvisor.com/Owners
        2. Login to your business account
        3. Go to "Marketing Tools" > "Widgets"
        4. Choose "Review Widget"
        5. Customize and copy the embed code
        6. Replace the div below with your embed code
      */}
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-gray-500">
          <svg
            className="mx-auto h-12 w-12 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <p className="font-medium mb-2">Tripadvisor Widget Placeholder</p>
          <p className="text-sm max-w-md mx-auto">
            To display your Tripadvisor reviews, add your widget code to{" "}
            <code className="bg-gray-200 px-1 rounded">
              src/components/ExternalReviewsWidget.tsx
            </code>
          </p>
        </div>
      </div>

      {/* Example Tripadvisor widget code structure (REPLACE WITH YOUR OWN):

      <div id="TA_selfserveprop123" className="TA_selfserveprop">
        <ul id="TA_selfserveprop_UL">
          <li id="TA_selfserveprop_LI" className="TA_selfserveprop_LI">
            <a target="_blank" href="https://www.tripadvisor.com/"><img src="https://www.tripadvisor.com/img/cdsi/partner/tripadvisor_logo_115x18-12778-2.gif" alt="TripAdvisor"/></a>
          </li>
        </ul>
      </div>
      <script async src="https://www.jungscharwuerenlos.ch/tripadvisor-widgets/selfserveprop/selfserveprop.js"></script>

      */}
    </div>
  );
}

export function GoogleReviewsWidget() {
  return (
    <div className="google-reviews-widget-container">
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">Google Reviews</h3>
        <p className="text-sm text-gray-600 mb-4">
          Read reviews from our Google Business Profile
        </p>
      </div>

      {/*
        Replace this placeholder with your actual Google Reviews widget

        Options for embedding Google Reviews:

        Option 1: Direct link to Google Business Profile
        <a
          href="https://www.google.com/maps/place/YOUR_BUSINESS_NAME"
          target="_blank"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View our Google Reviews
        </a>

        Option 2: Use a third-party widget service like:
        - EmbedSocial (https://embedsocial.com/products/reviews/)
        - Elfsight (https://elfsight.com/google-reviews-widget/)
        - POWR (https://www.powr.io/plugins/google-reviews)

        Option 3: Google My Business API (requires development)
      */}
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-gray-500">
          <svg
            className="mx-auto h-12 w-12 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-medium mb-2">Google Reviews Widget Placeholder</p>
          <p className="text-sm max-w-md mx-auto mb-4">
            To display your Google reviews, choose one of the options documented in{" "}
            <code className="bg-gray-200 px-1 rounded">
              src/components/ExternalReviewsWidget.tsx
            </code>
          </p>

          {/* Temporary link to Google Business Profile */}
          <a
            href="https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            View Google Reviews
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Combined External Reviews Component
 * Use this to show both Tripadvisor and Google reviews side by side
 */
export function ExternalReviews() {
  return (
    <div className="external-reviews-section py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">
          What Travelers Say About Us
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TripadvisorWidget />
          <GoogleReviewsWidget />
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Reviews are independently verified by{" "}
            <a
              href="https://www.tripadvisor.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Tripadvisor
            </a>{" "}
            and{" "}
            <a
              href="https://www.google.com/business"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Google
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
