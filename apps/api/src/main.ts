import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors();
    app.setGlobalPrefix('api');

    // Validación global de DTOs
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,        // elimina campos no declarados en el DTO
            forbidNonWhitelisted: false,
            transform: true,        // convierte tipos (string → number, etc.)
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    // Formato de respuesta uniforme { success, data, timestamp }
    app.useGlobalInterceptors(new ResponseInterceptor());

    // Manejo centralizado de errores
    app.useGlobalFilters(new AllExceptionsFilter());

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`FastPochi API corriendo en http://localhost:${port}/api`);
}
bootstrap();
