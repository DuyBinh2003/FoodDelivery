import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DispatchService, type UploadedProofFile } from '@/modules/dispatch/dispatch.service.js';
import { UpdateDriverGeoDto } from '@/modules/dispatch/dto/update-driver-geo.dto.js';
import { UpdateDriverStatusDto } from '@/modules/dispatch/dto/update-driver-status.dto.js';
import { AcceptTripDto, RejectTripDto } from '@/modules/dispatch/dto/respond-trip.dto.js';
import { ManualDispatchDto } from '@/modules/dispatch/dto/manual-dispatch.dto.js';
import { CreateDeliveryProofDto } from '@/modules/dispatch/dto/create-delivery-proof.dto.js';

@Controller('delivery')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('driver/location')
  async updateDriverLocation(@Body() dto: UpdateDriverGeoDto) {
    return this.dispatchService.updateDriverLocation(dto);
  }

  @Post('driver/status')
  async updateDriverStatus(@Body() dto: UpdateDriverStatusDto) {
    return this.dispatchService.updateDriverStatus(dto);
  }

  @Post('orders/:orderId/accept')
  async acceptTrip(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AcceptTripDto,
  ) {
    return this.dispatchService.acceptTrip(orderId, dto.driver_id);
  }

  @Post('orders/:orderId/reject')
  async rejectTrip(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: RejectTripDto,
  ) {
    return this.dispatchService.rejectTrip(orderId, dto.driver_id, dto.reason);
  }

  @Post('dispatch/manual')
  async manualDispatch(@Body() input: ManualDispatchDto) {
    return this.dispatchService.dispatchOrder(input);
  }

  @Post('orders/:orderId/proof/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProofPhoto(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @UploadedFile() file: UploadedProofFile,
  ) {
    return this.dispatchService.uploadProofPhoto(orderId, file);
  }

  @Post('orders/:orderId/proof')
  async createDeliveryProof(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateDeliveryProofDto,
  ) {
    return this.dispatchService.createDeliveryProof(orderId, dto);
  }

  @Get('orders/:orderId/proof')
  async getDeliveryProofs(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.dispatchService.getDeliveryProofs(orderId);
  }
}
