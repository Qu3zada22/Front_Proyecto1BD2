import { Controller, Get, Query } from '@nestjs/common';
import { ReportesService } from './reportes.service';

@Controller('reports')
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) { }

    // ── Simples ──────────────────────────────────────────────────────────────

    @Get('orders/by-status')
    ordenesPorEstado() {
        return this.reportesService.ordenesPorEstado();
    }

    @Get('orders/count')
    totalOrdenes() {
        return this.reportesService.totalOrdenes();
    }

    @Get('restaurants/categories/distinct')
    categoriasDistintas() {
        return this.reportesService.categoriasDistintas();
    }

    @Get('users/by-role')
    usuariosPorRol() {
        return this.reportesService.usuariosPorRol();
    }

    // ── Complejas ────────────────────────────────────────────────────────────

    @Get('restaurants/top-rated')
    topRestaurantes(@Query('limit') limit: string) {
        return this.reportesService.topRestaurantes(+limit || 10);
    }

    @Get('menu-items/best-sellers')
    platillosMasVendidos(@Query('limit') limit: string) {
        return this.reportesService.platillosMasVendidos(+limit || 10);
    }

    @Get('revenue/by-day')
    ingresosPorDia(@Query('desde') desde: string, @Query('hasta') hasta: string) {
        const now = new Date();
        const start = desde ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const end = hasta ?? now.toISOString();
        return this.reportesService.ingresosPorDia(start, end);
    }

    @Get('restaurants/by-category')
    restaurantesPorCategoria() {
        return this.reportesService.restaurantesPorCategoria();
    }
}
