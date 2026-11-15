import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../../../auth/infrastructure/adapters/in/http/decorators/current-user.decorator';
import { Roles } from '../../../../../auth/infrastructure/adapters/in/http/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../auth/infrastructure/adapters/in/http/guards/roles.guard';
import { CreateLocationUseCase } from '../../../../application/use-cases/create-location.use-case';
import { GetLocationsUseCase } from '../../../../application/use-cases/get-locations.use-case';
import { UpdateLocationUseCase } from '../../../../application/use-cases/update-location.use-case';
import { CreateLocationHttpDto } from './dto/create-location.http-dto';
import { UpdateLocationHttpDto } from './dto/update-location.http-dto';

@ApiTags('Locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
export class LocationsController {
  constructor(
    private readonly createLocationUseCase: CreateLocationUseCase,
    private readonly getLocationsUseCase: GetLocationsUseCase,
    private readonly updateLocationUseCase: UpdateLocationUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create location (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Location created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @Body() dto: CreateLocationHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.createLocationUseCase.execute(dto, user?.id, ipAddress);
  }

  @Get()
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.TECNICO)
  @ApiOperation({ summary: 'List all locations' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of locations' })
  async findAll(@Query('active', new ParseBoolPipe({ optional: true })) active?: boolean) {
    return this.getLocationsUseCase.execute(active);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update location (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateLocationHttpDto,
    @CurrentUser() user: { id: string },
    @Ip() ipAddress: string,
  ) {
    return this.updateLocationUseCase.execute(id, dto, user?.id, ipAddress);
  }
}
