export interface ToolShema {
  type: "tool" | string;  // or "function"
  name: string;
  description: string;
  strict?: boolean;
  parameters: {
    type: "object";
    description?: string;
    properties: {
      [key: string]: {
        type: "string" | "number" | "boolean" | "object" | "array";
        description?: string;
        enum?: string[];
        properties?: {
          [key: string]: ToolShema["parameters"]["properties"][string]; // recursive
        };
        items?: ToolShema["parameters"]["properties"][string] | ToolShema["parameters"]["properties"][string][];
        required?: string[];
        additionalProperties?: boolean;
        default?: unknown;
        examples?: unknown[];
      };
    };
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface ToolResult<T extends object = object> {
  success: boolean;
  message: string;
  data: T;
}
