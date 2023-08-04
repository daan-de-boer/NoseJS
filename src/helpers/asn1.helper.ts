import forge from "node-forge";

export type IssuerSerialAsn1 = {
  serialNumber: forge.asn1.Asn1;
  issuer: forge.asn1.Asn1;
};

export default class Asn1Helper {
  /**
   * Creates two ASN1 structures representing the issuer and serialNumber. Together they represent IssuerSerial
   *
   * @param certificate Certificate (.pfx file) to extract the issuer, signature and serialNumber from.
   * @returns object containing issuer, signature and serialNumber ASN.1 objects.
   */
  static createIssuerSerialValues(
    certificate: forge.pki.Certificate
  ): IssuerSerialAsn1 {
    const attributes = certificate.issuer.attributes;

    const relativeDistinguishedNames = attributes
      .filter(
        (attribute) =>
          attribute.name !== undefined && attribute.value !== undefined
      )
      .map((attribute) => {
        const oid = forge.pki.oids[attribute.name!];

        if (oid === undefined) {
          throw new Error(`Unknown oid: ${attribute.name}`);
        }

        return forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.SET,
          true,
          [
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.SEQUENCE,
              true,
              [
                forge.asn1.create(
                  forge.asn1.Class.UNIVERSAL,
                  forge.asn1.Type.OID,
                  false,
                  forge.asn1.oidToDer(oid).getBytes()
                ),
                forge.asn1.create(
                  forge.asn1.Class.UNIVERSAL,
                  attribute.valueTagClass as number as forge.asn1.Type,
                  false,
                  attribute.value!
                ),
              ]
            ),
          ]
        );
      });

    const issuerAsn1 = forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.SEQUENCE,
      true,
      relativeDistinguishedNames
    );

    const serialNumberAsn1 = forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.INTEGER,
      false,
      Buffer.from(certificate.serialNumber, "hex").toString("binary")
    );

    return {
      serialNumber: serialNumberAsn1,
      issuer: issuerAsn1,
    };
  }

  /**
   *
   * @param asn1Object ASN.1 object to create the certificate for
   * @returns
   */
  static createAsn1Certificate(
    issuerSerialAsn1: IssuerSerialAsn1
  ): forge.asn1.Asn1 {
    const { serialNumber, issuer } = issuerSerialAsn1;

    return forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.SEQUENCE,
      true,
      [
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.SEQUENCE,
          true,
          [
            forge.asn1.create(
              forge.asn1.Class.CONTEXT_SPECIFIC,
              forge.asn1.Type.OCTETSTRING,
              true,
              [issuer]
            ),
          ]
        ),
        serialNumber,
      ]
    );
  }

  /**
   * Encodes an ASN.1 object using base64 encoding. The ASN.1 object will be DER encoded first.
   *
   * @param asn1Object ASN.1 object to encode
   * @returns base64 encoding of the ASN.1 object
   */
  static encodeAsn1Object(asn1Object: forge.asn1.Asn1): string {
    return forge.util.encode64(
      Buffer.from(forge.asn1.toDer(asn1Object).getBytes()).toString()
    );
  }
}
