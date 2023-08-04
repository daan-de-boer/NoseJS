import * as fastify from "fastify";
import { MultipartValue } from "@fastify/multipart";
import { BadRequestException } from "@nestjs/common";

export class MultipartHelper {
  static async parseMultipart(req: fastify.FastifyRequest): Promise<
    {
      [fieldName: string]: any;
    } & {
      fileBuffer: Buffer;
    }
  > {
    const multipart = await req.file();
    if (!req.isMultipart() || multipart === undefined) {
      throw new BadRequestException("Request body is not multipart");
    }

    // Workaround;
    // Sometimes not all fields are present in the fastify multipart object.
    // This seems to be a timing issue, since waiting even 1ms prevents the problem.
    // TODO: Find the real cause, if it's not an issue within fastify.
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1));
    const buffer = await multipart.toBuffer();

    const multipartBody: { [fieldName: string]: any } = {};
    for (const fieldKey of Object.keys(multipart.fields).filter(
      (key) => key !== multipart.fieldname
    )) {
      const field = multipart.fields[fieldKey] as MultipartValue<string>;
      multipartBody[fieldKey] = field.value;
    }

    return { ...multipartBody, fileBuffer: buffer };
  }
}
