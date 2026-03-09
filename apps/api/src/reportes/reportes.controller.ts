import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@Controller('reports')
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) { }

    // ── Reportes simples ─────────────────────────────────────────────────────

    @Get('orders/by-status')
    @ApiOperation({ summary: 'Órdenes por estado', description: 'Aggregation simple: $group por estado.' })
    ordenesPorEstado() {
        return this.reportesService.ordenesPorEstado();
    }

    @Get('orders/count')
    @ApiOperation({ summary: 'Total de órdenes', description: 'Aggregation con $count.' })
    totalOrdenes() {
        return this.reportesService.totalOrdenes();
    }

    @Get('restaurants/categories/distinct')
    @ApiOperation({ summary: 'Categorías distintas', description: 'Usa distinct() sobre el campo categorias (índice multikey).' })
    categoriasDistintas() {
        return this.reportesService.categoriasDistintas();
    }

    @Get('users/by-role')
    @ApiOperation({ summary: 'Usuarios por rol', description: 'Aggregation simple: $group por rol.' })
    usuariosPorRol() {
        return this.reportesService.usuariosPorRol();
    }

    // ── Reportes complejos ───────────────────────────────────────────────────

    @Get('restaurants/top-rated')
    @ApiOperation({ summary: 'Top restaurantes', description: 'Aggregation compleja: parte de resenas (fuente de verdad) → $group avg/count → $match(≥5 reseñas) → $sort/$limit → $lookup restaurantes → $project.' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    topRestaurantes(@Query('limit') limit: string) {
        return this.reportesService.topRestaurantes(+limit || 10);
    }

    @Get('menu-items/best-sellers')
    @ApiOperation({ summary: 'Platillos más vendidos', description: 'Aggregation: $unwind items + $group por item_id + $sort por cantidad.' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    platillosMasVendidos(@Query('limit') limit: string) {
        return this.reportesService.platillosMasVendidos(+limit || 10);
    }

    @Get('revenue/by-day')
    @ApiOperation({ summary: 'Ingresos por día', description: 'Aggregation: $match por rango de fechas + $group con $dateToString + suma de totales.' })
    @ApiQuery({ name: 'desde', required: false, example: '2023-01-01', description: 'Fecha inicio ISO (default: 2023-01-01, datos entre 2023-2025)' })
    @ApiQuery({ name: 'hasta', required: false, example: '2025-12-31', description: 'Fecha fin ISO (default: 2025-12-31)' })
    ingresosPorDia(@Query('desde') desde: string, @Query('hasta') hasta: string) {
        const start = desde ?? '2023-01-01';
        const end = hasta ?? '2025-12-31';
        if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
            throw new BadRequestException('Formato de fecha inválido. Use formato ISO (YYYY-MM-DD)');
        }
        return this.reportesService.ingresosPorDia(start, end);
    }

    @Get('restaurants/by-category')
    @ApiOperation({ summary: 'Restaurantes por categoría', description: 'Aggregation: $unwind categorias + $group por categoría.' })
    restaurantesPorCategoria() {
        return this.reportesService.restaurantesPorCategoria();
    }

    @Get('revenue/by-restaurant-month')
    @ApiOperation({
        summary: 'Ingresos por restaurante por mes',
        description: 'Aggregation: $group por restaurante_id + año + mes → $lookup restaurante. Muestra el mes más reciente primero.',
    })
    ingresosPorRestaurantePorMes() {
        return this.reportesService.ingresosPorRestaurantePorMes();
    }

    @Get('users/top-spenders')
    @ApiOperation({
        summary: 'Usuarios con mayor gasto',
        description: 'Aggregation: $match entregado → $group por usuario_id con $sum total → $sort → $lookup usuario (sin password).',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    usuariosConMayorGasto(@Query('limit') limit: string) {
        return this.reportesService.usuariosConMayorGasto(+limit || 10);
    }
}
