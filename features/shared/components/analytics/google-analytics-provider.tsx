'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { getGoogleAnalyticsId } from '../../lib/client-env';

type GtagCommand = 'config' | 'event' | 'js' | 'set';
type GtagConfigParams = {
  page_location?: string;
  page_title?: string;
  anonymize_ip?: boolean;
  allow_enhanced_conversions?: boolean;
  send_to?: string;
};
type GtagEventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag: (command: GtagCommand, targetId?: string | Date, params?: GtagConfigParams | GtagEventParams) => void;
    dataLayer: Array<[GtagCommand, string | Date | undefined, GtagConfigParams | GtagEventParams | undefined]>;
  }
}

interface GoogleAnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Google Analytics Provider Component
 *
 * Handles the initialization and configuration of Google Analytics (gtag.js)
 * for the application. Only loads when a valid tracking ID is provided.
 */
export function GoogleAnalyticsProvider({ children }: GoogleAnalyticsProviderProps) {
  const googleAnalyticsId = getGoogleAnalyticsId();

  useEffect(() => {
    if (!googleAnalyticsId) {
      return;
    }

    // Initialize dataLayer if it doesn't exist
    window.dataLayer = window.dataLayer || [];

    // Define gtag function
    function gtag(command: GtagCommand, targetId?: string | Date, params?: GtagConfigParams | GtagEventParams) {
      window.dataLayer.push([command, targetId || undefined, params || undefined]);
    }

    // Make gtag available globally
    window.gtag = gtag;

    // Configure Google Analytics
    gtag('js', new Date());
    gtag('config', googleAnalyticsId, {
      // Respect user privacy preferences
      anonymize_ip: true,
      // Enable enhanced ecommerce for business tracking
      allow_enhanced_conversions: true,
    });
  }, [googleAnalyticsId]);

  // Don't render analytics scripts if no tracking ID is provided
  if (!googleAnalyticsId) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Google Analytics Script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
        strategy="afterInteractive"
        async
      />
      {children}
    </>
  );
}

/**
 * Track custom events with Google Analytics
 */
export function trackGoogleAnalyticsEvent(
  eventName: string,
  parameters?: GtagEventParams
) {
  const googleAnalyticsId = getGoogleAnalyticsId();

  if (!googleAnalyticsId || typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', eventName, {
    ...parameters,
    // Add default parameters for business context
    send_to: googleAnalyticsId,
  });
}

/**
 * Track page views with Google Analytics
 */
export function trackGoogleAnalyticsPageView(url: string, title?: string) {
  const googleAnalyticsId = getGoogleAnalyticsId();

  if (!googleAnalyticsId || typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('config', googleAnalyticsId, {
    page_location: url,
    page_title: title,
  });
}
