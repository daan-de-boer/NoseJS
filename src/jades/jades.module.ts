import { Module } from "@nestjs/common";
import { JadesController } from "./jades.controller.js";
import { JadesService } from "./jades.service.js";
import { JadesVerificationService } from "./jades-verification.service.js";
import { JadesSigningService } from "./jades-signing.service.js";

@Module({
  controllers: [JadesController],
  providers: [JadesService, JadesSigningService, JadesVerificationService],
})
export class JadesModule {}
