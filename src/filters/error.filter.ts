import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FastifyReply } from "fastify";

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

/**
 * NestJs filter that catches all errors, logs them and creates an error response body.
 */
@Catch(Error)
export class ErrorFilter implements ExceptionFilter {
  constructor() {}

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const isHttpException = exception instanceof HttpException;

    // Some exceptions are intentional, such as authorization and validation errors.
    // For these errors we just directly pass NestJS's response body.
    // For all unintentional errors we create our own response body.
    const isIntentionalException =
      isHttpException &&
      exception.getStatus() !== HttpStatus.INTERNAL_SERVER_ERROR;
    let responseBody: ErrorResponseBody | object;
    if (isIntentionalException) {
      const nestJsErrorResponse = exception.getResponse();
      responseBody =
        nestJsErrorResponse instanceof Object
          ? { ...nestJsErrorResponse }
          : createErrorResponseBody(nestJsErrorResponse);
    } else {
      responseBody = createErrorResponseBody();
    }

    console.error(`[error]`, exception);

    response
      .code(
        isHttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR
      )
      .send(responseBody);
  }
}

/**
 * Create an error response body
 */
function createErrorResponseBody(customMessage?: string): ErrorResponseBody {
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: customMessage ?? "Internal Server Error",
  };
}
