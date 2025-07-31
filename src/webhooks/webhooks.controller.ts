import { Body, Controller, Post, Logger, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { HeliusWebhookDto } from './dto/helius-webhook.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService, private configService: ConfigService) { }

  @Post('helius')
  @ApiOperation({ summary: 'Receive Helius transaction webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleHeliusWebhook(@Body() webhookData: HeliusWebhookDto[], @Headers('authorization') authHeader?: string, @Headers('user-agent') userAgent?: string) {
    try {
      console.log("webhookData", webhookData);
      console.log("tokenTransfers", webhookData[0].tokenTransfers);
      if (authHeader !== this.configService.get('WEBHOOK_AUTH_TOKEN')) {
        this.logger.error(`Invalid auth header: ${authHeader}`);
        throw new UnauthorizedException('Invalid webhook authentication');
      }

      if (userAgent && !userAgent.includes('Helius-Webhook-Service')) {
        this.logger.warn(`Suspicious webhook call from: ${userAgent}`);
      }

      this.logger.log(`Received ${webhookData.length} transaction(s) from Helius`);
      console.log("webhookData", webhookData);

      // Process each transaction
      for (const transaction of webhookData) {
        await this.webhooksService.processTransaction(transaction);
      }

      return { success: true, processed: webhookData.length };
    } catch (error) {
      this.logger.error('Error processing Helius webhook:', error);
      throw error;
    }
  }
}