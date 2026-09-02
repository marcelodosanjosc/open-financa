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
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DEFAULT_USER_ID } from '../../common/constants';
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
  async previewFile(@UploadedFile() file: Express.Multer.File) {
    return this.importService.parseFile(DEFAULT_USER_ID, file);
  }

  @Post('ai-classify')
  @ApiOperation({
    summary:
      'Classify a batch of imported transactions using local LLM / Ollama with heuristic fallback',
  })
  @UsePipes(new ZodValidationPipe(AiClassifyInputSchema))
  async classifyTransactions(@Body() body: AiClassifyInputDto) {
    return this.importService.classifyTransactions(DEFAULT_USER_ID, body);
  }

  @Post('confirm')
  @ApiOperation({
    summary:
      'Confirm batch import of previewed transactions into ledger or card invoice',
  })
  @UsePipes(new ZodValidationPipe(ConfirmImportSchema))
  async confirmImport(@Body() body: ConfirmImportDto) {
    return this.importService.confirmImport(DEFAULT_USER_ID, body);
  }
}
