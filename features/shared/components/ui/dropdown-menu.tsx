"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface SimpleDropdownProps {
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}

export function SimpleDropdown({ value, onValueChange, placeholder, options }: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 rounded-lg futuristic-card border-primary/30 bg-background text-foreground flex items-center justify-between hover:bg-primary/5 transition-colors"
      >
        {selectedOption ? (
          <div className="flex items-center gap-2">
            <selectedOption.icon className="h-4 w-4 text-primary" />
            <span>{selectedOption.label}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 futuristic-card border-primary/30 bg-background z-10 rounded-lg overflow-hidden">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onValueChange(option.id);
                setIsOpen(false);
              }}
              className="w-full p-3 flex items-center gap-2 hover:bg-primary/10 transition-colors text-left"
            >
              <option.icon className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
