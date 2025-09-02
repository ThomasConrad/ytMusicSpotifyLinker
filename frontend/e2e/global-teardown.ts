import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test teardown...');
  
  // Any global cleanup needed after tests complete
  // For example: cleaning up test database, stopping mock servers, etc.
  
  console.log('✅ E2E test teardown complete');
}

export default globalTeardown;