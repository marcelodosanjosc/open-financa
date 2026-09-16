import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StatementImportService } from './statement-import.service';
import {
  ConfirmImportSchema,
  ConfirmImportDto,
  AiClassifyInputSchema,
  AiClassifyInputDto,
  UserPayloadDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Statement Import')
@Controller('statement-import')
export class StatementImportController {
  constructor(private readonly importService: StatementImportService) {}

  @Post('preview')
  @ApiOperation({
    summary:
      'Upload file (.ofx, .csv, .pdf) for parsing and duplicate detection preview',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async previewFile(
    @CurrentUser() user: UserPayloadDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.importService.parseFile(user.id, file);
  }

  @Post('ai-classify')
  @ApiOperation({
    summary:
      'Classify a batch of imported transactions using local LLM / Ollama with heuristic fallback',
  })
  @UsePipes(new ZodValidationPipe(AiClassifyInputSchema))
  async classifyTransactions(
    @CurrentUser() user: UserPayloadDto,
    @Body() body: AiClassifyInputDto,
  ) {
    return this.importService.classifyTransactions(user.id, body);
  }

  @Post('confirm')
  @ApiOperation({
    summary:
      'Confirm batch import of previewed transactions into ledger or card invoice',
  })
  @UsePipes(new ZodValidationPipe(ConfirmImportSchema))
  async confirmImport(
    @CurrentUser() user: UserPayloadDto,
    @Body() body: ConfirmImportDto,
  ) {
    return this.importService.confirmImport(user.id, body);
  }
}
