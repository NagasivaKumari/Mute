import { NestFactory } from '@nestjs/core';
import { AppModule } from '../backend/src/app.module';
import { PoliciesService } from '../backend/src/policies/policies.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const policiesService = app.get(PoliciesService);

  // Replace with actual Org ID and User ID
  const orgId = '6a7c2800885fb8334de84e42'; 
  const userId = '6a7c2800885fb8334de84e42';

  console.log('Seeding system policies...');
  await policiesService.seedSystemPolicies(orgId, userId);
  console.log('System policies seeded.');

  await app.close();
}

bootstrap();
