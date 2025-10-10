"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready(cb: () => void): void;
        execute(siteKey: string, options: { action: string }): Promise<string>;
      };
    };
  }
}

interface UseRecaptchaEnterpriseOptions {
  action: string;
}

interface UseRecaptchaEnterpriseResult {
  isReady: boolean;
  execute: () => Promise<string>;
  error: Error | null;
}

const SCRIPT_ID = "recaptcha-enterprise-script";

export function useRecaptchaEnterprise({ action }: UseRecaptchaEnterpriseOptions): UseRecaptchaEnterpriseResult {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const siteKeyRef = useRef<string | undefined>(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const siteKey = siteKeyRef.current;

    if (!siteKey) {
      setError(new Error("Missing NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY"));
      return;
    }

    if (window.grecaptcha?.enterprise) {
      window.grecaptcha.enterprise.ready(() => {
        setIsReady(true);
      });
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setError(new Error("Failed to load reCAPTCHA Enterprise"));
    };
    script.onload = () => {
      window.grecaptcha?.enterprise?.ready(() => {
        setIsReady(true);
      });
    };
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  const execute = useCallback(async () => {
    const siteKey = siteKeyRef.current;
    if (!siteKey) {
      throw new Error("Missing NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY");
    }
    if (!window.grecaptcha?.enterprise) {
      throw new Error("reCAPTCHA Enterprise has not loaded yet");
    }
    return window.grecaptcha.enterprise.execute(siteKey, { action });
  }, [action]);

  return { isReady, execute, error };
}
