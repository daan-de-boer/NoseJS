import { BadRequestException, Controller, Post, Req } from "@nestjs/common";
import * as fastify from "fastify";
import { JadesService } from "./jades.service";
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { VerificationResultDto } from "./dtos/verification-result.dto";
import { JadesDto } from "./dtos/jades.dto";
import { MultipartHelper } from "src/helpers/multipart.helper";
import { plainToInstance } from "class-transformer";
import { ValidationHelper } from "src/helpers/validation.helper";

@Controller("jades")
@ApiTags("JAdES")
export class JadesController {
  constructor(private readonly jadesService: JadesService) {}

  @Post("sign")
  @ApiOperation({ summary: "Submit a file to have it signed." })
  @ApiResponse({
    status: 200,
    type: JadesDto,
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        signingCertificateKey: {
          type: "string",
          format: "text",
        },
      },
      required: ["file", "signingCertificateKey"],
    },
  })
  async sign(@Req() req: fastify.FastifyRequest) {
    const multipart = await MultipartHelper.parseMultipart(req);
    const signingCertificateKey = multipart.signingCertificateKey;

    const signedJson = await this.jadesService.sign(
      multipart.fileBuffer,
      signingCertificateKey
    );

    return JadesDto.fromJoseJws(signedJson);
  }

  @Post("verify")
  @ApiOperation({ summary: "Submit a JAdES signature to have it verified." })
  @ApiResponse({
    status: 200,
    type: VerificationResultDto,
    description: "The verification result",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        organizationIdentifier: {
          type: "string",
          format: "text",
        },
      },
      required: ["file", "organizationIdentifier"],
    },
  })
  async verify(
    @Req() req: fastify.FastifyRequest
  ): Promise<VerificationResultDto> {
    const multipart = await MultipartHelper.parseMultipart(req);
    const organizationIdentifier = multipart.organizationIdentifier;
    const json = multipart.fileBuffer.toString("utf-8");
    const obj = JSON.parse(json) as unknown;

    const jades = plainToInstance(JadesDto, obj);
    ValidationHelper.validateInstanceOrThrow(jades, BadRequestException);

    const verificationResult = await this.jadesService.verifySignature(
      jades,
      organizationIdentifier
    );

    return new VerificationResultDto(
      verificationResult.result,
      verificationResult.failureReasons
    );
  }
}
