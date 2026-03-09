import { Controller, Get, Query } from '@nestjs/common';
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
    @ApiOperation({ summary: 'Top restaurantes', description: 'Aggregation compleja: $lookup reseñas → $addFields calificacion_prom → $sort.' })
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
    @ApiQuery({ name: 'desde', required: false, example: '2026-01-01', description: 'Fecha inicio ISO (default: inicio del mes)' })
    @ApiQuery({ name: 'hasta', required: false, example: '2026-03-08', description: 'Fecha fin ISO (default: hoy)' })
    ingresosPorDia(@Query('desde') desde: string, @Query('hasta') hasta: string) {
        const now = new Date();
        const start = desde ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const end = hasta ?? now.toISOString();
        return this.reportesService.ingresosPorDia(start, end);
    }

    @Get('restaurants/by-category')
    @ApiOperation({ summary: 'Restaurantes por categoría', description: 'Aggregation: $unwind categorias + $group por categoría.' })
    restaurantesPorCategoria() {
        return this.reportesService.restaurantesPorCategoria();
    }
}
