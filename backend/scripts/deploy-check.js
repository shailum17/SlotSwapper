#!/usr/bin/env node

/**
 * Pre-deployment validation script
 * Checks environment variables, dependencies, and basic functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 SlotSwapper API - Pre-deployment Check\n');

// Check package.json
const packagePath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packagePath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
console.log(`✅ Package: ${pkg.name} v${pkg.version}`);

// Check required dependencies
const requiredDeps = [
  'express',
  'mongoose',
  'bcryptjs',
  'jsonwebtoken',
  'cors',
  'express-validator'
];

const missingDeps = requiredDeps.filter(dep => !pkg.dependencies[dep]);
if (missingDeps.length > 0) {
  console.error('❌ Missing dependencies:', missingDeps.join(', '));
  process.exit(1);
}
console.log('✅ All required dependencies present');

// Check TypeScript files
const apiFile = path.join(__dirname, '..', 'api', 'index.ts');
const serverFile = path.join(__dirname, '..', 'src', 'server.ts');

if (!fs.existsSync(apiFile)) {
  console.error('❌ API file not found: api/index.ts');
  process.exit(1);
}

if (!fs.existsSync(serverFile)) {
  console.error('❌ Server file not found: src/server.ts');
  process.exit(1);
}

console.log('✅ Core TypeScript files present');

// Check environment variables (if .env exists)
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const hasMongoUri = envContent.includes('MONGODB_URI=');
  const hasJwtSecret = envContent.includes('JWT_SECRET=');
  
  if (!hasMongoUri) {
    console.warn('⚠️  MONGODB_URI not found in .env file');
  } else {
    console.log('✅ MONGODB_URI configured');
  }
  
  if (!hasJwtSecret) {
    console.warn('⚠️  JWT_SECRET not found in .env file');
  } else {
    console.log('✅ JWT_SECRET configured');
  }
} else {
  console.warn('⚠️  .env file not found - ensure environment variables are set in production');
}

// Check Vercel configuration
const vercelFile = path.join(__dirname, '..', 'vercel.json');
if (fs.existsSync(vercelFile)) {
  console.log('✅ Vercel configuration present');
} else {
  console.warn('⚠️  vercel.json not found');
}

console.log('\n🎉 Pre-deployment check completed!');
console.log('\nNext steps:');
console.log('1. Ensure environment variables are set in production');
console.log('2. Test the API endpoints');
console.log('3. Monitor the /health endpoint after deployment');
console.log('4. Check logs for any issues');