"use client";

import { BusinessAnalysis } from '../lib/types/onboarding-session';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/features/shared';
import { Check, X, Edit, ExternalLink } from 'lucide-react';

interface BusinessInfoReviewProps {
  analysis: BusinessAnalysis;
  onConfirm?: () => void;
  onEdit?: () => void;
}

export function BusinessInfoReview({ analysis, onConfirm, onEdit }: BusinessInfoReviewProps) {
  const confidenceColor = 
    analysis.confidence && analysis.confidence > 0.8 ? 'text-green-600' :
    analysis.confidence && analysis.confidence > 0.6 ? 'text-yellow-600' :
    'text-orange-600';

  return (
    <div className="space-y-4">
      {/* Header with confidence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Business Information</CardTitle>
            {analysis.confidence !== undefined && (
              <div className={`text-sm font-medium ${confidenceColor}`}>
                {Math.round(analysis.confidence * 100)}% confidence
              </div>
            )}
          </div>
          {analysis.websiteUrl && (
            <a
              href={analysis.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              {analysis.websiteUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardHeader>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Business Name" value={analysis.businessName} />
          <InfoRow label="Description" value={analysis.description} />
          <InfoRow label="Industry" value={analysis.industry} />
          <InfoRow label="Category" value={analysis.category} />
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Email" value={analysis.email} />
          <InfoRow label="Phone" value={analysis.phone} />
          <InfoRow label="Address" value={analysis.address} />
        </CardContent>
      </Card>

      {/* Services */}
      {analysis.services && analysis.services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Services ({analysis.services.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.services.map((service, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="font-medium text-sm">{service.name}</div>
                  {service.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {service.description}
                    </div>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {service.suggestedPrice && (
                      <span>Price: ${service.suggestedPrice}</span>
                    )}
                    {service.duration && (
                      <span>Duration: {service.duration} min</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Characteristics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow 
            label="Mobile Services" 
            value={analysis.hasMobileServices ? 'Yes' : 'No'}
            icon={analysis.hasMobileServices ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />}
          />
          <InfoRow 
            label="Location Services" 
            value={analysis.hasLocationServices ? 'Yes' : 'No'}
            icon={analysis.hasLocationServices ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />}
          />
          <InfoRow label="Operating Hours" value={analysis.operatingHours} />
          <InfoRow label="Service Area" value={analysis.serviceArea} />
        </CardContent>
      </Card>

      {/* Social Media */}
      {analysis.socialMedia && Object.values(analysis.socialMedia).some(v => v) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Social Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.socialMedia.facebook && (
              <InfoRow label="Facebook" value={analysis.socialMedia.facebook} />
            )}
            {analysis.socialMedia.instagram && (
              <InfoRow label="Instagram" value={analysis.socialMedia.instagram} />
            )}
            {analysis.socialMedia.linkedin && (
              <InfoRow label="LinkedIn" value={analysis.socialMedia.linkedin} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onEdit && (
          <Button variant="outline" onClick={onEdit} className="flex-1">
            <Edit className="h-4 w-4 mr-2" />
            Edit Information
          </Button>
        )}
        {onConfirm && (
          <Button onClick={onConfirm} className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Looks Good
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value?: string | null; 
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-right">
          {value || <span className="text-muted-foreground italic">Not found</span>}
        </span>
      </div>
    </div>
  );
}
