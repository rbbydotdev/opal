import { DestinationType } from "@/data/DestinationSchemaMap";
import { AgentFromRemoteAuthFactory } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";

/**
 * Base validation helper that handles common auth validation and agent creation
 */
export function createValidationHelper<TAgent>(expectedSource: DestinationType) {
  return {
    /**
     * Validates authentication and creates the appropriate agent
     */
    validateAuthAndCreateAgent: (remoteAuth: RemoteAuthDAO | null): TAgent => {
      if (!remoteAuth || remoteAuth.source !== expectedSource) {
        throw new Error(`${expectedSource.charAt(0).toUpperCase() + expectedSource.slice(1)} authentication required`);
      }

      const agent = AgentFromRemoteAuthFactory(remoteAuth) as TAgent | null;
      if (!agent) {
        throw new Error(`Failed to initialize ${expectedSource} client`);
      }

      return agent;
    },

    /**
     * Validates that a required field is not empty
     */
    validateRequired: (value: string | undefined, fieldName: string): string => {
      if (!value || !value.trim()) {
        throw new Error(`${fieldName} is required`);
      }
      return value.trim();
    },

    /**
     * Wraps async validation logic with consistent error handling
     */
    withErrorHandling: async <T>(
      operation: () => Promise<T>,
      context: string,
      customErrorHandler?: (error: Error) => Error
    ): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        if (error instanceof Error) {
          if (customErrorHandler) {
            throw customErrorHandler(error);
          }
          throw error;
        }
        throw new Error(`Failed to ${context}: ${String(error)}`);
      }
    },

    /**
     * Creates a validation error with consistent formatting
     */
    createValidationError: (message: string, context?: string): Error => {
      const fullMessage = context ? `${context}: ${message}` : message;
      return new Error(fullMessage);
    },
  };
}

/**
 * Helper for handling 404 errors specifically (common for resource lookups)
 */
export function handleNotFoundError(error: Error, resourceType: string, resourceName: string): Error {
  if (error.message.includes("404")) {
    return new Error(`${resourceType} "${resourceName}" not found or you don't have access to it`);
  }
  return error;
}

/**
 * Helper for conditionally updating fields (like baseURL in GitHub)
 */
export function conditionalUpdate<T>(currentValue: T, newValue: T, shouldUpdate: (current: T) => boolean): T {
  return shouldUpdate(currentValue) ? newValue : currentValue;
}

/**
 * Creates a form-like setter utility for nested object updates using dot notation
 * Similar to React Hook Form's setValue but for plain objects
 */
export function createFormSetter<TData extends Record<string, any>>(initialData: TData) {
  let data = { ...initialData };

  return {
    /**
     * Set a value using dot notation (e.g., "meta.repository", "user.profile.name")
     */
    set<T = any>(path: string, value: T): void {
      const keys = path.split(".");
      let current: any = data;

      // Navigate to the parent of the target property
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        //@ts-ignore
        if (!(key in current) || typeof current[key] !== "object" || current[key] === null) current[key] = {};
        current = current[key!];
      }

      // Set the final value
      current[keys[keys.length - 1]!] = value;
    },

    /**
     * Get a value using dot notation
     */
    get<T = any>(path: string): T {
      const keys = path.split(".");
      let current: any = data;

      for (const key of keys) {
        if (current == null || !(key in current)) {
          return undefined as T;
        }
        current = current[key];
      }

      return current as T;
    },

    /**
     * Get the complete data object
     */
    getData(): TData {
      return data;
    },

    /**
     * Reset to initial data
     */
    reset(newData?: TData): void {
      data = { ...(newData || initialData) };
    },
  };
}

/**
 * Convenience function for updating form data in validation functions
 */
export function updateFormData<TData extends Record<string, any>>(
  formData: TData,
  updates: Record<string, any>
): TData {
  const setter = createFormSetter(formData);

  for (const [path, value] of Object.entries(updates)) {
    setter.set(path, value);
  }

  return setter.getData();
}
