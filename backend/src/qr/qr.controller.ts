import { Controller, Get, Param } from '@nestjs/common';
import { QrService } from './qr.service';

@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get(':tableCode')
  getSession(@Param('tableCode') tableCode: string) {
    return this.qrService.getOrCreateSession(tableCode);
  }
}
