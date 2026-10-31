import 'reflect-metadata'
import { resolve } from 'node:path'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { config } from 'dotenv'
import helmet from 'helmet'
import { AppModule } from './app.module'

config({ path: resolve(__dirname, '../../../.env') })
config({ path: resolve(__dirname, '../.env') })

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())

  app.use(helmet())
  app.enableCors({ origin: allowedOrigins, credentials: true })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))

  await app.listen(Number(process.env.API_PORT ?? 3000), '0.0.0.0')
}

void bootstrap()