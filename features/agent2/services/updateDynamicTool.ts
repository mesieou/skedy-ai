import { ServiceRepository } from '../../shared/lib/database/repositories/service-repository';
import type { OpenAIFunctionSchema, ParameterDefinition } from '../../shared/lib/database/types/tools';
import assert from 'assert';

/**
 * Update tool schema with service-specific parameters
 * Takes existing tool schema and service name, returns updated schema with dynamic parameters
 */
export async function updateDynamicTool(
  toolSchema: OpenAIFunctionSchema,
  businessId: string,
  serviceName: string
): Promise<OpenAIFunctionSchema> {
  const serviceRepo = new ServiceRepository();

  // Get service with requirements
  const service = await serviceRepo.findOne({
    business_id: businessId,
    name: serviceName
  });
  assert(service, `Service not found: ${serviceName}`);

  // Get service requirements and job scopes
  const serviceRequirements = service.ai_function_requirements || [];
  const serviceJobScopes = service.ai_job_scope_options || [];

  // Start with existing properties and required fields
  const properties: Record<string, ParameterDefinition> = {
    ...toolSchema.function.parameters.properties
  };
  const required: string[] = [
    ...(toolSchema.function.parameters.required || [])
  ];

  // Append service requirements to existing properties
  serviceRequirements.forEach(requirement => {
    const property = convertRequirementToProperty(requirement);
    if (property) {
      properties[requirement] = property;
      required.push(requirement);
    }
  });

  // Append job_scope if service has options
  if (serviceJobScopes.length > 0) {
    properties.job_scope = {
      type: "string",
      description: "Job scope",
      enum: serviceJobScopes
    };
    required.push('job_scope');
  }

  // Return updated schema with appended parameters
  return {
    ...toolSchema,
    function: {
      ...toolSchema.function,
      description: `Get price quote for ${service.name}`,
      parameters: {
        type: "object",
        properties,
        required,
        additionalProperties: false
      }
    }
  };
}

/**
 * Convert requirement string to OpenAI property (same as old agent)
 */
function convertRequirementToProperty(requirement: string): ParameterDefinition {
  switch (requirement) {
    case 'pickup_addresses':
      return {
        type: "array",
        description: "Pickup addresses",
        items: { type: "string" }
      };
    case 'dropoff_addresses':
      return {
        type: "array",
        description: "Dropoff addresses",
        items: { type: "string" }
      };
    case 'customer_address':
      return {
        type: "string",
        description: "Customer address"
      };
    case 'number_of_people':
      return {
        type: "number",
        description: "Number of people"
      };
    case 'number_of_rooms':
      return {
        type: "number",
        description: "Number of rooms"
      };
    case 'square_meters':
      return {
        type: "number",
        description: "Square meters"
      };
    case 'number_of_vehicles':
      return {
        type: "number",
        description: "Number of vehicles"
      };
    default:
      return {
        type: "string",
        description: `Additional requirement: ${requirement}`
      };
  }
}
