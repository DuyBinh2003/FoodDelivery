import { execSync } from 'child_process';

const services = [
  'user-service',
  'admin-service',
  'restaurant-service',
  'order-service',
  'delivery-service',
  'search-service',
  'payment-service',
];

console.log('Resolving aliases for shared libs...');
execSync(
  'npx tsc-alias -p tsconfig.json --dir dist/libs',
  { stdio: 'inherit' }
);

for (const service of services) {
  console.log(`Resolving aliases for ${service}...`);
  execSync(
    `npx tsc-alias -p apps/${service}/tsconfig.json --dir dist/apps/${service}`,
    { stdio: 'inherit' }
  );
}

console.log('All aliases resolved successfully.');
