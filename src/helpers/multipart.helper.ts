import * as fastify from "fastify";
import { MultipartFile } from "@fastify/multipart";
import { BadRequestException } from "@nestjs/common";

type MultipartData = {
  [fieldName: string]: any;
} & {
  fileBuffer: Buffer;
};

export class MultipartHelper {
  static async parseMultipart(
    req: fastify.FastifyRequest
  ): Promise<MultipartData> {
    if (!req.isMultipart()) {
      throw new BadRequestException("Request body is not multipart");
    }

    // Parse multipart fields.
    let multipartFileBuffer: Buffer | undefined = undefined;
    const multipartBody: { [fieldname: string]: any } = {};

    for await (const part of req.parts()) {
      const field = part.fields[part.fieldname] as any;

      if (field.fieldname === "file") {
        if (field.type !== "file") {
          throw new BadRequestException("Multipart field 'file' is not a file");
        }

        const file = part as MultipartFile;
        multipartFileBuffer = await file.toBuffer();
      } else {
        multipartBody[part.fieldname] = field.value;
      }
    }

    // Validate if the multipart body contained the a file
    if (multipartFileBuffer === undefined) {
      throw new BadRequestException("file is required");
    }

    return { ...multipartBody, fileBuffer: multipartFileBuffer };
  }
}
