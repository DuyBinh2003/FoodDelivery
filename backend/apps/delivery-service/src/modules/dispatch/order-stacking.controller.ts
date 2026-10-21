import { Controller, Post, Get, Patch, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { OrderStackingService } from '@/modules/dispatch/services/order-stacking.service.js';
import { EvaluateStackingDto } from '@/modules/dispatch/dto/evaluate-stacking.dto.js';
import { CreateStackedTripDto } from '@/modules/dispatch/dto/create-stacked-trip.dto.js';

@Controller('delivery/stacking')
export class OrderStackingController {
  constructor(private readonly stackingService: OrderStackingService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  evaluateEligibility(@Body() dto: EvaluateStackingDto) {
    return this.stackingService.evaluateEligibility(dto.primaryOrder, dto.candidateOrder);
  }

  @Post('optimize-route')
  @HttpCode(HttpStatus.OK)
  optimizeRoute(@Body() dto: EvaluateStackingDto) {
    return this.stackingService.optimizeWaypoints(dto.primaryOrder, dto.candidateOrder);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  createStackedTrip(@Body() dto: CreateStackedTripDto) {
    return this.stackingService.createStackedTrip(dto);
  }

  @Get('drivers/:driverId/current')
  getActiveTrip(@Param('driverId') driverId: string) {
    return this.stackingService.getActiveStackedTripByDriver(driverId);
  }

  @Patch(':tripId/next-waypoint')
  @HttpCode(HttpStatus.OK)
  advanceNextWaypoint(
    @Param('tripId') tripId: string,
    @Body('driverId') driverId: string,
  ) {
    return this.stackingService.advanceNextWaypoint(tripId, driverId);
  }
}
