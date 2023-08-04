import { validateSync, ValidationError } from "class-validator";

export interface ValidationResult {
  valid: boolean;
  errorMessages: string[];
}

export class ValidationHelper {
  /**
   * Validate given instance against any class-validator's decorators present within the instance's type.
   *
   * @param object The instance to validate
   * @returns A 'report' of validating the instance, includes error messages if the result is not valid.
   */
  static validateInstance(object: object): ValidationResult {
    const validationResult = validateSync(object);
    const errorMessages = this.convertValidationErrors(validationResult);

    return {
      valid: errorMessages.length === 0,
      errorMessages,
    };
  }

  /**
   * Validate given instance against any class-validator's decorators present within the instance's type. If the object is not valid, it throws an exception that contains the error messages array.
   *
   * @param object The instance to validate
   * @param errorConstructor Constructor of an Error object to throw
   */
  static validateInstanceOrThrow(
    object: object,
    errorConstructor: new (error: any) => Error = Error
  ) {
    const result = this.validateInstance(object);

    if (!result.valid) {
      throw new errorConstructor(result.errorMessages);
    }
  }

  /**
   * Extract the error messages as strings from class-transformer's validation error objects
   */
  private static convertValidationErrors(errors: ValidationError[]): string[] {
    // Find the error messages in the current array of errors
    const currentErrors = errors.flatMap((err) =>
      err.constraints ? Object.values(err.constraints) : []
    );

    // Find errors in the children of the current array of errors.
    const childrenErrors = errors.flatMap((err) =>
      err.children ? this.convertValidationErrors(err.children) : []
    );

    return currentErrors.concat(childrenErrors);
  }
}
