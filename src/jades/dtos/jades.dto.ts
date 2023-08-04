import { ApiProperty } from "@nestjs/swagger";
import { FlattenedJWSInput, GeneralJWS } from "jose";
import {
  ArrayMinSize,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class JadesSignatureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  protected: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signature: string;

  constructor(protected_: string, signature: string) {
    this.protected = protected_;
    this.signature = signature;
  }

  static fromJoseSignature(joseSignature: Omit<FlattenedJWSInput, "payload">) {
    if (joseSignature.protected === undefined) {
      throw new Error(`Protected field missing in JWS`);
    }

    return new JadesSignatureDto(
      joseSignature.protected,
      joseSignature.signature
    );
  }
}

export class JadesDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payload: string;
  @ApiProperty({
    type: JadesSignatureDto,
    isArray: true,
  })
  @ArrayMinSize(1)
  @ValidateNested()
  @Type(() => JadesSignatureDto)
  signatures: JadesSignatureDto[];

  constructor(payload: string, signatures: JadesSignatureDto[]) {
    this.payload = payload;
    this.signatures = signatures;
  }

  static fromJoseJws(joseJws: GeneralJWS) {
    const payload = joseJws.payload;
    const signatures = joseJws.signatures.map((sig) =>
      JadesSignatureDto.fromJoseSignature(sig)
    );

    return new JadesDto(payload, signatures);
  }
}
