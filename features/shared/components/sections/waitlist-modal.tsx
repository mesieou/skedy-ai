"use client";

import { FormCard } from '@/features/shared/components/ui/form-card';
import { Dialog, DialogContent } from '@/features/shared/components/ui/dialog';
import { Mail } from 'lucide-react';
import { trackFacebookPixelEvent } from '../analytics/facebook-pixel-provider';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const handleSubmit = async (data: Record<string, string>) => {
    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone_number: data.phone_number,
        address: data.address,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to join waitlist');
    }

    // Track successful waitlist submission
    trackFacebookPixelEvent('CompleteRegistration', {
      content_name: 'Waitlist Signup',
      value: 1,
      currency: 'AUD'
    });
  };

  const waitlistFields = [
    {
      id: 'name',
      label: 'Name',
      type: 'text' as const,
      placeholder: 'Your full name',
      required: true,
    },
    {
      id: 'email',
      label: 'Email',
      type: 'email' as const,
      placeholder: 'your@email.com',
      required: true,
      validation: (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : 'Please enter a valid email address';
      }
    },
    {
      id: 'phone_number',
      label: 'Phone',
      type: 'tel' as const,
      placeholder: '+61 400 000 000',
      required: false,
    },
    {
      id: 'address',
      label: 'Business Address',
      type: 'text' as const,
      placeholder: 'Your business location',
      required: false,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 bg-transparent border-none shadow-none">
        <FormCard
          title="Join the Waitlist"
          description="Be the first to know when Skedy AI launches. Get early access and exclusive updates."
          fields={waitlistFields}
          submitText="Join Waitlist"
          loadingText="Joining..."
          successTitle="Welcome to the waitlist!"
          successMessage="We'll notify you when Skedy AI is ready for early access."
          onSubmit={handleSubmit}
          onClose={onClose}
          icon={<Mail className="h-5 w-5 text-primary" />}
        />
      </DialogContent>
    </Dialog>
  );
}
