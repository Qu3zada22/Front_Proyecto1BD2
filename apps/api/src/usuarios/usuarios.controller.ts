import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import {
  CreateUsuarioDto,
  DireccionUsuarioDto,
} from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@ApiTags('usuarios')
@Controller('users')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear usuario',
    description: 'Crea un nuevo usuario en el sistema.',
  })
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar usuarios',
    description: 'Devuelve todos los usuarios con filtros opcionales.',
  })
  @ApiQuery({
    name: 'rol',
    required: false,
    enum: ['cliente', 'propietario', 'admin'],
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filtrar por email (búsqueda parcial)',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('rol') rol?: string,
    @Query('email') email?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usuariosService.findAll({
      rol,
      email,
      skip: skip !== undefined ? parseInt(skip, 10) || 0 : undefined,
      limit: limit !== undefined ? parseInt(limit, 10) || 50 : undefined,
    });
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login por email',
    description:
      'Devuelve el usuario si existe y está activo (sin contraseña).',
  })
  @ApiBody({ schema: { example: { email: 'ana.garcia@email.com' } } })
  login(@Body('email') email: string) {
    return this.usuariosService.login(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', description: 'ObjectId del usuario' })
  findOne(@Param('id', ParseMongoIdPipe) id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiParam({ name: 'id', description: 'ObjectId del usuario' })
  update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiParam({ name: 'id', description: 'ObjectId del usuario' })
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.usuariosService.remove(id);
  }

  @Post(':id/addresses')
  @ApiOperation({
    summary: 'Agregar dirección',
    description: 'Usa $push para añadir dirección al array embebido.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId del usuario' })
  addAddress(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: DireccionUsuarioDto,
  ) {
    return this.usuariosService.addAddress(id, dto);
  }

  @Delete(':id/addresses/:alias')
  @ApiOperation({
    summary: 'Eliminar dirección',
    description: 'Usa $pull para remover dirección del array por alias.',
  })
  @ApiParam({ name: 'id', description: 'ObjectId del usuario' })
  @ApiParam({
    name: 'alias',
    description: 'Alias de la dirección (ej. Casa, Oficina)',
  })
  removeAddress(
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('alias') alias: string,
  ) {
    return this.usuariosService.removeAddress(id, alias);
  }

  @Get('by-email/:email')
  @ApiOperation({
    summary: 'Buscar usuario por email exacto',
    description:
      'Busca un usuario por email exacto. Útil para validación de duplicados.',
  })
  @ApiParam({ name: 'email', description: 'Email exacto del usuario' })
  findByEmail(@Param('email') email: string) {
    return this.usuariosService.findByEmail(email);
  }
}
