import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Root & Health Check' })
  getRoot() {
    return {
      name: 'Adyapan AI / AgentCall AI API',
      version: '1.0.0',
      status: 'healthy',
      docs: '/api/v1/docs',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health Check Endpoint' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
