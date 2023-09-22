import * as forge from "node-forge";
import PfxHelper from "../helpers/pfx.helper";
import * as jose from "jose";
import { Injectable, Logger } from "@nestjs/common";
import { FailureReasonDto } from "./dtos/verification-result.dto";
import { JadesDto } from "./dtos/jades.dto";
import { instanceToPlain } from "class-transformer";

const PFX_ATTR_TYPE_ORGANIZATION_IDENTIFIER = "2.5.4.97";

@Injectable()
export class JadesVerificationService {
  private readonly allowedIssuerThumbprints: string[];
  private logger = new Logger(JadesVerificationService.name);

  constructor() {
    const enviromentThumbprint =
      process.env.SIGNING_CERTIFICATE_ALLOWED_ISSUERS_CSV;

    if (!enviromentThumbprint) {
      throw new Error(
        "Env var SIGNING_CERTIFICATE_ALLOWED_ISSUERS_CSV not set."
      );
    }

    this.allowedIssuerThumbprints = enviromentThumbprint
      .split(",")
      .map((s) => s.trim());
  }

  /**
   * Verifies the JAdES formatted jws
   *
   * @param jsonContent
   * @returns
   */
  async verify(
    jades: JadesDto,
    organizationIdentifier: string
  ): Promise<{ result: boolean; failureReasons?: FailureReasonDto[] }> {
    const jwsSignatures = await this.jwsParseSignatures(jades);
    const failureReasons: FailureReasonDto[] = [];

    for (let sigIdx = 0; sigIdx < jwsSignatures.length; sigIdx++) {
      const { certificate, publicKey } = jwsSignatures[sigIdx]!;
      let protectedHeader: jose.JWSHeaderParameters | undefined;

      try {
        // generalVerify doesn't accept a class instance, only plain objects
        const jadesObj = instanceToPlain(jades) as jose.GeneralJWSInput;
        const jws = await jose.generalVerify(jadesObj, publicKey, {
          algorithms: ["RS256", "RS384", "RS512"],
          crit: {
            sigT: true,
          },
        });

        protectedHeader = jws.protectedHeader;
      } catch (error) {
        if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
          failureReasons.push(
            new FailureReasonDto("Signature is not valid.", sigIdx)
          );
        } else {
          failureReasons.push(
            new FailureReasonDto(
              "An unexpected error happened during verification.",
              sigIdx
            )
          );

          console.error(error);
        }
        break;
      }

      if (protectedHeader === undefined) {
        failureReasons.push(
          new FailureReasonDto("Protected header missing in JWS.", sigIdx)
        );
      } else if (protectedHeader.x5c === undefined) {
        failureReasons.push(
          new FailureReasonDto("Certificate chain missing in JWS.", sigIdx)
        );
      } else {
        if (!this.verifyDate(certificate)) {
          failureReasons.push(
            new FailureReasonDto(
              "System date not in certificate's validity range.",
              sigIdx
            )
          );
        }

        if (
          !this.verifyOrganizationIdentifier(
            protectedHeader,
            organizationIdentifier
          )
        ) {
          failureReasons.push(
            new FailureReasonDto(
              "Missing organizationIdentifier in certificate, not specified or incorrect.",
              sigIdx
            )
          );
        }

        const certificateChain = protectedHeader.x5c.map((certificate) =>
          forge.pki.certificateFromPem(this.reconstructPem(certificate))
        );

        const rootCertificate = certificateChain.at(-1);

        if (rootCertificate === undefined) {
          failureReasons.push(
            new FailureReasonDto("Certificate chain is empty.", sigIdx)
          );
        }

        if (
          rootCertificate !== undefined &&
          !this.verifyThumbprint(rootCertificate)
        ) {
          failureReasons.push(
            new FailureReasonDto(
              "Thumbprint of root certificate does not match.",
              sigIdx
            )
          );
        }

        if (
          !this.verifyCertificateChain(certificateChain) &&
          process.env?.NODE_ENV !== "development"
        ) {
          failureReasons.push(
            new FailureReasonDto("Certificate chain is not valid.", sigIdx)
          );
        }
      }
    }

    // if the amound of failures match the amound of certificates the signature is considered invalid.
    if (failureReasons.length === jwsSignatures.length) {
      return {
        result: false,
        failureReasons,
      };
    }

    return {
      result: true,
    };
  }

  /**
   * Verifies the certifcate chain. Note that this will return false if there's only one certificate in the chain.
   * @param chain
   * @returns
   */
  private verifyCertificateChain(chain: forge.pki.Certificate[]) {
    const verifiedCertificates: {
      certificate: forge.pki.Certificate;
      verified: boolean;
    }[] = [];

    for (let i = chain.length - 1; i > 0; i--) {
      const current = chain[i];
      const next = chain[i - 1];

      if (current === undefined || next === undefined) {
        throw new Error(
          "Failed to verify certificate chain; check if the for loop is correct"
        );
      }

      const verified = current.verify(next);

      if (verified) {
        verifiedCertificates.push({ certificate: current, verified });
      }
    }

    return verifiedCertificates.filter((pem) => pem.verified).length > 0;
  }

  private reconstructPem(base64Encoded: string) {
    const start = "-----BEGIN CERTIFICATE-----\n";
    const end = "\n-----END CERTIFICATE-----";
    return start + base64Encoded + end;
  }

  /**
   * Parses the jws and retrieves a certificate and public key pair.
   *
   * @param jwsJson
   * @returns
   */
  private async jwsParseSignatures(jwsJson: JadesDto): Promise<
    {
      certificate: forge.pki.Certificate;
      signature: string;
      publicKey: jose.KeyLike;
    }[]
  > {
    try {
      return await Promise.all(
        jwsJson.signatures.map(async (sig) => {
          const protectedJson = JSON.parse(
            Buffer.from(sig.protected, "base64").toString("utf-8")
          );
          const certificatePem = this.reconstructPem(protectedJson.x5c[0]);
          const certificate = forge.pki.certificateFromPem(certificatePem);
          const signature = sig.signature;
          const publicKey = await jose.importX509(certificatePem, "RS256");

          return { certificate, signature, publicKey };
        })
      );
    } catch {
      return [];
    }
  }

  private verifyDate(certificate: forge.pki.Certificate) {
    const dateBeforeValid =
      Date.now() - certificate.validity.notBefore.getTime() > 0;
    const dateAfterValid =
      Date.now() - certificate.validity.notAfter.getTime() < 0;

    return dateBeforeValid && dateAfterValid;
  }

  private verifyOrganizationIdentifier(
    protectedHeader: jose.JWSHeaderParameters,
    organizationIdentifier: string
  ) {
    const signingCertificateBase64 = protectedHeader.x5c?.[0];
    if (signingCertificateBase64 === undefined) {
      return false;
    }

    const ownCertificate = forge.pki.certificateFromPem(
      this.reconstructPem(signingCertificateBase64)
    );
    const organizationIdentifierAttribute =
      ownCertificate.subject.attributes.find(
        (attr) => attr.type === PFX_ATTR_TYPE_ORGANIZATION_IDENTIFIER
      );

    const organizationIdentifierInCertificate =
      organizationIdentifierAttribute?.value;

    return organizationIdentifier === organizationIdentifierInCertificate;
  }

  private verifyThumbprint(
    signingCertificateRootIssuer: forge.pki.Certificate
  ) {
    const issuerThumbprint = PfxHelper.getThumbprint(
      signingCertificateRootIssuer
    );

    return this.allowedIssuerThumbprints.includes(issuerThumbprint);
  }
}
