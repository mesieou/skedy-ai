"use client";

import { useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { SimpleDropdown } from "@/features/shared/components/ui/dropdown-menu";
import { Truck, Wrench, Scissors, MoreHorizontal, Monitor, Phone } from "lucide-react";
import { BusinessCategory } from "@/features/shared/lib/database/types/business";
interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: (businessType: string, method: "web" | "phone") => Promise<void>;
}

// Helper function to get category information for demo businesses
const getCategoryInfo = (category: BusinessCategory) => {
  switch (category) {
    case BusinessCategory.REMOVALIST:
      return {
        icon: Truck,
        displayName: 'Removalist Services',
        description: 'House moves, furniture removal, transport'
      };
    case BusinessCategory.MANICURIST:
      return {
        icon: Scissors,
        displayName: 'Mobile Manicurist',
        description: 'Professional nail services at your location'
      };
    case BusinessCategory.PLUMBER:
      return {
        icon: Wrench,
        displayName: 'Plumbing Services',
        description: 'Emergency repairs, maintenance, installations'
      };
    default:
      return {
        icon: MoreHorizontal,
        displayName: 'Unknown Service',
        description: 'Unknown service type'
      };
  }
};

export function DemoModal({ isOpen, onClose, onStartDemo }: DemoModalProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');

  if (!isOpen) return null;

  // Only show the 3 supported demo business types
  const supportedCategories = [
    BusinessCategory.REMOVALIST,
    BusinessCategory.MANICURIST,
    BusinessCategory.PLUMBER
  ];

  const businessTypes = supportedCategories.map((category) => {
    const categoryInfo = getCategoryInfo(category);
    return {
      id: category,
      label: categoryInfo.displayName,
      description: categoryInfo.description,
      icon: categoryInfo.icon
    };
  });


  return (
    <div
      className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-lg"
      onClick={onClose}
    >
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl bg-background/95 backdrop-blur-xl rounded-3xl border border-primary/30 shadow-2xl overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >

          {/* Futuristic background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
          <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />

          {/* Floating particles */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-ping" />
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-secondary/40 rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-accent/30 rounded-full animate-bounce" />

          <div className="relative z-10 p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
                AI Assistant Demo
              </h2>
              <p className="text-muted-foreground text-lg">
                Choose a business type to demo our AI assistant:
              </p>
            </div>

            {/* Business Type Dropdown */}
            <div className="mb-8">
              <SimpleDropdown
                value={selectedBusiness}
                onValueChange={setSelectedBusiness}
                placeholder="Select Business Type"
                options={businessTypes}
              />
            </div>

            {/* Demo Buttons */}
            {selectedBusiness && (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Button
                  size="lg"
                  onClick={() => {
                    console.log('🎯 [DemoModal] Try Web Demo clicked!', { selectedBusiness });
                    onStartDemo(selectedBusiness, "web");
                  }}
                  className="w-full sm:w-auto btn text-sm sm:text-base"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  Try Web Demo
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    console.log('📞 [DemoModal] Try Phone Demo clicked!', { selectedBusiness });
                    onStartDemo(selectedBusiness, "phone");
                  }}
                  className="w-full sm:w-auto btn-outline text-sm sm:text-base"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Try Phone Demo
                </Button>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
