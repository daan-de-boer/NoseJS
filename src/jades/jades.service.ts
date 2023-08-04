import { Injectable, BadRequestException } from "@nestjs/common";
import Jose from "jose";
import { PfxData, csvToMap } from "./../utils/util.js";
import { BaseLine, JadesSigningService } from "./jades-signing.service.js";
import { JadesVerificationService } from "./jades-verification.service.js";
import { VerificationResultDto } from "./dtos/verification-result.dto.js";
import { JadesDto } from "./dtos/jades.dto.js";

@Injectable()
export class JadesService {
  pfxFilesMap: Map<string, PfxData>;

  constructor(
    private readonly singingService: JadesSigningService,
    private readonly verificationService: JadesVerificationService
  ) {
    const PFX_PASS_CSV = process.env.PFX_PASS_CSV;

    if (!PFX_PASS_CSV) {
      throw new Error("Env var PFX_PASS_CSV not set.");
    }

    this.pfxFilesMap = csvToMap(PFX_PASS_CSV);
  }

  /**
   * Digitaly sign a buffer according to the JAdES standard.
   *
   * @returns signed json file.
   */
  async sign(
    payload: Buffer,
    signingCertificateKey: string
  ): Promise<Jose.GeneralJWS> {
    const pfxData = this.getPfxDataForSigningCertificateKey(
      signingCertificateKey
    );

    return await this.singingService.sign(
      payload,
      BaseLine.B,
      pfxData.buffer,
      pfxData.passphrase
    );
  }

  /**
   * Verify a JAdES signature
   * @param organizationIdentifier
   */
  async verifySignature(
    jades: JadesDto,
    organizationIdentifier: string
  ): Promise<VerificationResultDto> {
    const result = await this.verificationService.verify(
      jades,
      organizationIdentifier
    );

    return result;
  }

  /**
   * Validates if the request is multipart and the key exists in the pfx files map.
   *
   * @param signingCertificateKey
   *
   * @throws `BadRequestException` if request is not multipart or the key does not exists.
   */
  private getPfxDataForSigningCertificateKey(
    signingCertificateKey: string
  ): PfxData {
    const pfxData = this.pfxFilesMap.get(signingCertificateKey);

    if (pfxData === undefined) {
      throw new BadRequestException(
        `Invalid signingCertificateKey: ${signingCertificateKey}`
      );
    }

    return pfxData;
  }
}
