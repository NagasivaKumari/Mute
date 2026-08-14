import { Controller, Post, Body } from '@nestjs/common';
import { SecretMaskingService } from '../secrets/secret-masking.service';
import { IsNotEmpty, IsString } from 'class-validator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class ReadFileBody {
  @IsString()
  @IsNotEmpty()
  filePath!: string;

  @IsString()
  @IsNotEmpty()
  agent!: string;
}

@Controller('files')
export class FilesController {
  constructor(private readonly maskingService: SecretMaskingService) {}

  @Post('read')
  async readFile(@Body() body: ReadFileBody, @CurrentUser() user: AuthUser) {
    const result = await this.maskingService.maskFile(body.filePath, {
      organizationId: user?.organizationId,
      agentName: body.agent,
    });

    return {
      content: result.sanitizedContent,
      secretsFound: result.secretsFound,
      secretsMasked: result.secretsMasked,
    };
  }
}
