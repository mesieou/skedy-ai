"use client";

import { useState } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Loader2, CheckCircle, X } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'tel';
  placeholder: string;
  required?: boolean;
  validation?: (value: string) => string | null;
}

interface FormCardProps {
  title: string;
  description?: string;
  fields: FormField[];
  submitText: string;
  loadingText: string;
  successTitle: string;
  successMessage: string;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  onClose?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function FormCard({
  title,
  description,
  fields,
  submitText,
  loadingText,
  successTitle,
  successMessage,
  onSubmit,
  onClose,
  className = "",
  icon
}: FormCardProps) {
  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.id]: '' }), {})
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    for (const field of fields) {
      if (field.required && !formData[field.id]?.trim()) {
        setError(`${field.label} is required`);
        return;
      }

      // Custom validation
      if (field.validation && formData[field.id]) {
        const validationError = field.validation(formData[field.id]);
        if (validationError) {
          setError(validationError);
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      await onSubmit(formData);
      setIsSubmitted(true);

      // Auto-close after success (if onClose provided)
      if (onClose) {
        setTimeout(() => {
          onClose();
          resetForm();
        }, 3000);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(fields.reduce((acc, field) => ({ ...acc, [field.id]: '' }), {}));
    setIsSubmitted(false);
    setError('');
  };

  const handleClose = () => {
    if (!isLoading && onClose) {
      onClose();
      resetForm();
    }
  };

  const isFormValid = fields
    .filter(field => field.required)
    .every(field => formData[field.id]?.trim());

  return (
    <Card className={`w-full max-w-md mx-auto futuristic-card ${className}`}>
      <CardHeader className="relative pb-4">
        {onClose && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}

        <CardTitle className="flex items-center gap-2 text-xl text-card-foreground glow-text">
          {icon}
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={fields.length <= 2 || index >= 2 ? "sm:col-span-2" : ""}
                >
                  <div className="space-y-2">
                    <Label htmlFor={field.id} className="text-card-foreground font-medium">
                      {field.label} {field.required && <span className="text-primary">*</span>}
                    </Label>
                    <Input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        [field.id]: e.target.value
                      }))}
                      required={field.required}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-destructive text-sm text-center">
                  {error}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary shadow-lg"
              disabled={isLoading || !isFormValid}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {loadingText}
                </>
              ) : (
                submitText
              )}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-6 py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-xl">{successTitle}</h3>
              <p className="text-muted-foreground">
                {successMessage}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
