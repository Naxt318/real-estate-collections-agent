import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';

// TODO(task 7): add @SkipTenant() once the tenant guard exists; probes send no tenant.
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  // Liveness checks the process only. Readiness (database ping) comes with task 5's PrismaService.
  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }
}
