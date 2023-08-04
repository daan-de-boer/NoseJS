import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FailureReasonDto {
  @ApiProperty()
  reason: string;
  @ApiProperty()
  signatureIndex: number;

  constructor(failureReason: string, signatureIndex: number) {
    this.reason = failureReason;
    this.signatureIndex = signatureIndex;
  }
}

export class VerificationResultDto {
  @ApiProperty()
  result: boolean;
  @ApiPropertyOptional({
    type: FailureReasonDto,
    isArray: true,
  })
  failureReasons?: FailureReasonDto[];

  constructor(result?: boolean, failureReasons?: FailureReasonDto[]) {
    if (result !== undefined) {
      this.result = result;
    }

    if (failureReasons !== undefined) {
      this.failureReasons = failureReasons ?? undefined;
    }
  }
}
