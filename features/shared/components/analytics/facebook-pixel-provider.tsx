'use client';

import { useEffect } from 'react';
import Script from 'next/script';
// Facebook Pixel ID from environment variables

// TypeScript declarations for Facebook Pixel
interface FacebookPixelFunction {
  (command: 'track' | 'trackCustom' | 'init' | 'consent', eventName: string, parameters?: Record<string, unknown>): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: FacebookPixelFunction;
  loaded?: boolean;
  version?: string;
}

declare global {
  interface Window {
    fbq?: FacebookPixelFunction;
    _fbq?: FacebookPixelFunction;
  }
}

interface FacebookPixelProviderProps {
  children: React.ReactNode;
}

/**
 * Facebook Pixel Provider Component
 *
 * Handles the initialization and configuration of Facebook Pixel
 * for the application. Only loads when a valid Pixel ID is provided.
 */
export function FacebookPixelProvider({ children }: FacebookPixelProviderProps) {
  const facebookPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

  useEffect(() => {
    if (!facebookPixelId) {
      console.log('❌ Facebook Pixel: NO ID');
      return;
    }

    console.log('✅ Facebook Pixel ID:', facebookPixelId);

    // Initialize Facebook Pixel
    const initFacebookPixel = () => {
      // Check if fbq is already defined and properly initialized
      if (window.fbq && window.fbq.loaded) {
        return;
      }

      // Create the fbq function with proper typing
      const fbq: FacebookPixelFunction = function(
        command: 'track' | 'trackCustom' | 'init' | 'consent',
        eventName: string,
        parameters?: Record<string, unknown>
      ) {
        if (fbq.callMethod) {
          fbq.callMethod(...[command, eventName, parameters]);
        } else if (fbq.queue) {
          fbq.queue.push([command, eventName, parameters]);
        }
      } as FacebookPixelFunction;

      // Initialize fbq properties
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.push = fbq;

      // Assign to window
      if (!window.fbq) {
        window.fbq = fbq;
      }
      if (!window._fbq) {
        window._fbq = fbq;
      }

      // Initialize the pixel
      if (window.fbq) {
        window.fbq('init', facebookPixelId);
        window.fbq('track', 'PageView');
      }
    };

    initFacebookPixel();
  }, [facebookPixelId]);

  // Don't render pixel scripts if no tracking ID is provided
  if (!facebookPixelId) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Facebook Pixel Script */}
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        onLoad={() => console.log('✅ Facebook Pixel script loaded')}
        onError={() => console.error('❌ Facebook Pixel script BLOCKED (CSP or ad blocker)')}
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${facebookPixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      {children}
    </>
  );
}

/**
 * Track custom events with Facebook Pixel
 */
export function trackFacebookPixelEvent(
  eventName: string,
  parameters?: Record<string, unknown>
) {
  const facebookPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

  if (!facebookPixelId || typeof window === 'undefined' || !window.fbq) {
    return;
  }

  window.fbq('track', eventName, parameters);
}

/**
 * Track custom events with custom names (not standard Facebook events)
 */
export function trackFacebookPixelCustomEvent(
  eventName: string,
  parameters?: Record<string, unknown>
) {
  const facebookPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

  if (!facebookPixelId || typeof window === 'undefined' || !window.fbq) {
    return;
  }

  window.fbq('trackCustom', eventName, parameters);
}

/**
 * Standard Facebook Pixel Events
 *
 * Use these helper functions to track standard Facebook events:
 */
export const FacebookPixelEvents = {
  /** Track when a user views content */
  viewContent: (parameters?: { content_name?: string; content_category?: string; value?: number; currency?: string }) =>
    trackFacebookPixelEvent('ViewContent', parameters),

  /** Track when a user adds payment info */
  addPaymentInfo: () =>
    trackFacebookPixelEvent('AddPaymentInfo'),

  /** Track when a user adds to cart */
  addToCart: (parameters?: { content_name?: string; content_ids?: string[]; value?: number; currency?: string }) =>
    trackFacebookPixelEvent('AddToCart', parameters),

  /** Track when a user completes registration */
  completeRegistration: (parameters?: { content_name?: string; value?: number; currency?: string }) =>
    trackFacebookPixelEvent('CompleteRegistration', parameters),

  /** Track when a user contacts business */
  contact: () =>
    trackFacebookPixelEvent('Contact'),

  /** Track when a user initiates checkout */
  initiateCheckout: (parameters?: { value?: number; currency?: string; num_items?: number }) =>
    trackFacebookPixelEvent('InitiateCheckout', parameters),

  /** Track when a user generates a lead */
  lead: (parameters?: { content_name?: string; value?: number; currency?: string }) =>
    trackFacebookPixelEvent('Lead', parameters),

  /** Track when a user makes a purchase */
  purchase: (parameters: { value: number; currency: string; content_ids?: string[]; content_type?: string }) =>
    trackFacebookPixelEvent('Purchase', parameters),

  /** Track when a user searches */
  search: (parameters?: { search_string?: string; content_category?: string }) =>
    trackFacebookPixelEvent('Search', parameters),

  /** Track when a user starts a trial */
  startTrial: (parameters?: { value?: number; currency?: string; predicted_ltv?: number }) =>
    trackFacebookPixelEvent('StartTrial', parameters),

  /** Track when a user submits an application */
  submitApplication: () =>
    trackFacebookPixelEvent('SubmitApplication'),

  /** Track when a user subscribes */
  subscribe: (parameters?: { value?: number; currency?: string; predicted_ltv?: number }) =>
    trackFacebookPixelEvent('Subscribe', parameters),
};
