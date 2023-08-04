import * as forge from "node-forge";
import * as crypto from "crypto";
import Asn1Helper from "./asn1.helper";
import NodeRSA from "node-rsa";

export default class PfxHelper {
  /**
   * Get all the certificates from the .pfx file.
   * @param pfxFile
   * @param password
   */
  static getCertificateChainFromPfx(
    pfxFile: Buffer,
    password: string
  ): forge.pki.Certificate[] {
    const p12 = pfxFileToPkcs12(pfxFile, password);
    const filteredBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certificateBags = filteredBags[forge.pki.oids.certBag!] ?? [];
    const certificates = certificateBags
      .filter((bag) => bag.cert !== undefined)
      .map((bag) => bag.cert!);

    const chain = sortCertificateIssuerSubject(certificates);

    return chain;
  }

  /**
   * Converts a node-forge certificate to a x509 certificate
   */
  static certificateToX509(certificate: forge.pki.Certificate) {
    return new crypto.X509Certificate(forge.pki.certificateToPem(certificate));
  }

  /**
   * Get the kid from a certificate. The certificate used must be using the Certificate type of node-forge.
   */
  static getKidFromCertificate(certificate: forge.pki.Certificate) {
    return Asn1Helper.createAsn1Certificate(
      Asn1Helper.createIssuerSerialValues(certificate)
    );
  }

  /**
   * Get all X509 certificates and private key from a .pfx file
   *
   * @param pfxFile file to extract certificate and private key from.
   * @param password password for extracting private key.
   */
  static getCertificateAndPrivateKeyFromPfx(
    pfxFile: Buffer,
    password: string
  ): { certificates: crypto.X509Certificate[]; privateKeyString: string } {
    const certificates = PfxHelper.getCertificateChainFromPfx(
      pfxFile,
      password
    ).map((certificate) => PfxHelper.certificateToX509(certificate));

    const privateKeyString = getPrivateKeyFromPfx(pfxFile, password);

    return {
      certificates,
      privateKeyString,
    };
  }

  static getCertificateFromPfx(
    pfxFile: Buffer,
    password: string
  ): forge.pki.Certificate {
    const p12 = pfxFileToPkcs12(pfxFile, password);
    const bag = getBag(p12, forge.pki.oids.certBag!);

    if (bag.cert === undefined) {
      throw new Error(
        `Bag of type ${forge.pki.oids.certBag} does not contain a key`
      );
    }

    return bag.cert;
  }

  static getPemCertificateFromPfx(pfxFile: Buffer, password: string): string {
    const certificate = this.getCertificateFromPfx(pfxFile, password);

    return forge.pki.certificateToPem(certificate);
  }

  /**
   * Get the thumbprint of the given certificate
   * @param certificate
   */
  static getThumbprint(certificate: forge.pki.Certificate): string {
    const certificateAsn1 = forge.pki.certificateToAsn1(certificate);
    const certificateDer = forge.asn1.toDer(certificateAsn1);
    const messageDigest = forge.md.sha1.create();

    messageDigest.update(certificateDer.getBytes());

    return messageDigest.digest().toHex();
  }
}

function getPrivateKeyFromPfx(pfxFile: Buffer, password: string): string {
  const p12 = pfxFileToPkcs12(pfxFile, password);
  const bag = getBag(p12, forge.pki.oids.pkcs8ShroudedKeyBag!);

  if (bag.key === undefined) {
    throw new Error(
      `Bag of type ${forge.pki.oids.pkcs8ShroudedKeyBag} does not contain a key`
    );
  }

  // const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  // const bag = bags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
  const privateKeyPem = forge.pki.privateKeyToPem(bag.key);

  const nodeRsa = new NodeRSA();
  const importResult = nodeRsa.importKey(privateKeyPem, "pkcs1-private-pem");
  const pkcs8Key = importResult.exportKey("pkcs8-private-pem");

  return pkcs8Key;
}

function getBag(
  p12: forge.pkcs12.Pkcs12Pfx,
  bagType: string
): forge.pkcs12.Bag {
  const filteredBags = p12.getBags({ bagType: bagType });
  const bagsOfType = filteredBags[bagType] ?? [];
  const bag = bagsOfType[0];

  if (bag === undefined) {
    throw new Error(`No bag of type ${bagType} found in PFX`);
  }

  return bag;
}

/**
 * Convert a pfx file to pkcs12.
 *
 * @param pfxFile
 * @param password
 * @returns
 */
function pfxFileToPkcs12(
  pfxFile: Buffer,
  password: string
): forge.pkcs12.Pkcs12Pfx {
  const derEncodedCertificate = pfxFile.toString("binary");
  const p12Asn1 = forge.asn1.fromDer(derEncodedCertificate);

  return forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
}

/**
 * Sorts certificiates based on their issuer and subject
 *
 * @param certificates to sort
 * @returns
 */
function sortCertificateIssuerSubject(
  certificates: forge.pki.Certificate[]
): forge.pki.Certificate[] {
  const sorted = certificates.sort((certA, certB) => {
    if (certB.isIssuer(certA)) {
      return 1;
    }

    if (certA.isIssuer(certB)) {
      return -1;
    }

    return 0;
  });

  return sorted;
}
