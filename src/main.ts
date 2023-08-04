import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import fastifyMultipart from "@fastify/multipart";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { VersioningType } from "@nestjs/common";
import { ErrorFilter } from "./filters/error.filter";

const GLOBAL_PREFIX = "api";
const LISTEN_ADDRESS = process.env.HOSTNAME || "localhost";
const LISTEN_PORT = process.env.PORT || 3200;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  app.enableCors();
  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.useGlobalFilters(new ErrorFilter());
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  app.register(fastifyMultipart);

  const config = new DocumentBuilder()
    .setTitle("Nose API")
    .setDescription("API for signing and verifying AdES signatures")
    .setVersion("1.0")
    .build();

  const swaggerOptions = {
    customCss: `.topbar { display: none; }`,
    docExpansion: "full",
    showCommonExtension: true,
  };

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/v1", app, document, swaggerOptions);

  await app.listen(LISTEN_PORT, LISTEN_ADDRESS);
}
bootstrap();
