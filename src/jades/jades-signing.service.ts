import * as jose from "jose";
import Asn1Helper from "../helpers/asn1.helper.js";
import PfxHelper from "../helpers/pfx.helper.js";
import { Injectable } from "@nestjs/common";

export enum BaseLine {
  B = "B",
}

const SIGNING_CERTIFICATE = 0;

@Injectable()
export class JadesSigningService {
  async sign(
    payload: Buffer,
    baseline: BaseLine,
    pfxBuffer: Buffer,
    password: string
  ): Promise<jose.GeneralJWS> {
    const forgeCertificates = PfxHelper.getCertificateChainFromPfx(
      pfxBuffer,
      password
    );
    const { certificates, privateKeyString } =
      PfxHelper.getCertificateAndPrivateKeyFromPfx(pfxBuffer, password);

    const forgeSigningCertificate = forgeCertificates[SIGNING_CERTIFICATE];
    const signingCertificate = certificates[SIGNING_CERTIFICATE];

    if (
      forgeSigningCertificate === undefined ||
      signingCertificate === undefined
    ) {
      throw new Error(`PFX file does not have a certificate chain.`);
    }

    const kid = PfxHelper.getKidFromCertificate(forgeSigningCertificate);
    const kidEncoded64 = Asn1Helper.encodeAsn1Object(kid);
    const privateKey = await jose.importPKCS8(privateKeyString, "RS256");
    const generalSign = new jose.GeneralSign(payload);

    let signResult: jose.GeneralJWS;

    const signature = generalSign
      .addSignature(privateKey, {
        crit: {
          sigT: true,
        },
      })
      .setProtectedHeader({
        alg: "RS256",
        cty: "json",
        kid: kidEncoded64,
        "x5t#S256": Buffer.from(
          signingCertificate.fingerprint256.replaceAll(":", ""),
          "hex"
        ).toString("base64url"),
        x5c: certificates.map((certificate) =>
          certificate.raw.toString("base64")
        ),
        typ: "jose+json",
        sigT: new Date().toISOString().split(".")[0] + "Z", // remove milliseconds because dds validator won't recognise the timestamp
        crit: ["sigT"],
      });

    switch (baseline) {
      case BaseLine.B:
        signResult = await signature.sign();
        break;
      default:
        throw new Error(`Unsupported baseline: ${baseline}`);
    }

    return signResult;
  }
}
