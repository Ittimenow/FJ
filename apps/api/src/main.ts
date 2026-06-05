import "reflect-metadata";
import { Logger, RequestMethod, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { RedisIoAdapter } from "./config/redis-io.adapter";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const webOrigin =
    config.get<string>("WEB_ORIGIN") ??
    config.get<string>("APP_PUBLIC_URL") ??
    "http://localhost:3000";
  const corsOrigins = webOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigin = corsOrigins.length > 1
    ? corsOrigins
    : corsOrigins[0] ?? "http://localhost:3000";

  app.enableCors({
    origin: corsOrigin,
    credentials: true
  });
  app.setGlobalPrefix("api", {
    exclude: [{ path: "", method: RequestMethod.GET }]
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const redisUrl = config.get<string>("REDIS_URL");
  if (redisUrl) {
    const redisAdapter = new RedisIoAdapter(app);
    try {
      await redisAdapter.connectToRedis(redisUrl);
      app.useWebSocketAdapter(redisAdapter);
    } catch (error) {
      logger.warn(
        `Redis adapter disabled: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const port = Number(config.get<string>("API_PORT") ?? 4000);
  const host = config.get<string>("API_HOST");
  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }
  console.log(`API listening on http://${host ?? "localhost"}:${port}`);
}

bootstrap();
