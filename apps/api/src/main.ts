import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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
            whitelist: true,
            forbidNonWhitelisted: false,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    // Formato de respuesta uniforme { success, data, timestamp }
    app.useGlobalInterceptors(new ResponseInterceptor());

    // Manejo centralizado de errores
    app.useGlobalFilters(new AllExceptionsFilter());

    // Swagger / OpenAPI
    const config = new DocumentBuilder()
        .setTitle('FastPochi API')
        .setDescription(
            'API REST para el sistema de delivery FastPochi.\n\n' +
            'Todas las respuestas siguen el formato `{ success, data, timestamp }`.\n\n' +
            '**Colecciones:** usuarios · restaurantes · menu_items · ordenes · resenas\n\n' +
            '**Extras:** GridFS (archivos), aggregations, bulkWrite, transacciones ACID',
        )
        .setVersion('1.0')
        .addTag('usuarios', 'Gestión de usuarios y autenticación')
        .addTag('restaurantes', 'CRUD de restaurantes y búsqueda geoespacial')
        .addTag('menu-items', 'Platillos del menú por restaurante')
        .addTag('ordenes', 'Pedidos con transacciones ACID')
        .addTag('resenas', 'Reseñas de restaurantes')
        .addTag('reportes', 'Aggregation pipelines y reportes')
        .addTag('archivos', 'Upload/download de archivos via GridFS')
        .addTag('seed', 'Poblar / limpiar la base de datos')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
        customSiteTitle: 'FastPochi API Docs',
        jsonDocumentUrl: '/docs-json',
    });

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`FastPochi API corriendo en http://localhost:${port}/api`);
    console.log(`Swagger disponible en  http://localhost:${port}/docs`);
}
bootstrap();
