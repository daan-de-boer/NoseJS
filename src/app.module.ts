import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JadesModule } from "./jades/jades.module.js";

@Module({
  imports: [ConfigModule.forRoot(), JadesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
