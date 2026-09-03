#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔍 [DeepTerm] Running Environment & Configuration Validator...\n');

let hasError = false;

// 1. Check DEEPSEEK_TOKEN
const token = process.env.DEEPSEEK_TOKEN;
if (!token) {
  console.warn('⚠️  DEEPSEEK_TOKEN is not set in environment.');
  console.warn('   Action: Set DEEPSEEK_TOKEN in .env or Settings panel (Authorization: Bearer from chat.deepseek.com)');
} else if (token.length < 20) {
  console.warn('⚠️  DEEPSEEK_TOKEN appears too short or invalid format.');
} else {
  console.log('✅ DEEPSEEK_TOKEN is present (length: ' + token.length + ' chars)');
}

// 2. Check WORKSPACE_ROOT
const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
if (!fs.existsSync(workspaceRoot)) {
  console.error(`❌ WORKSPACE_ROOT does not exist: ${workspaceRoot}`);
  hasError = true;
} else {
  try {
    fs.accessSync(workspaceRoot, fs.constants.R_OK | fs.constants.W_OK);
    console.log(`✅ WORKSPACE_ROOT is accessible & writable: ${workspaceRoot}`);
  } catch (err) {
    console.error(`❌ WORKSPACE_ROOT is not writable: ${workspaceRoot} (${err.message})`);
    hasError = true;
  }
}

// 3. Check JWT_SECRET
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.warn('ℹ️  JWT_SECRET not set, using default development fallback secret.');
} else {
  console.log('✅ JWT_SECRET configured in environment.');
}

// 4. Check deepseek.wasm
const wasmPath = path.join(process.cwd(), 'deepseek.wasm');
if (fs.existsSync(wasmPath)) {
  const stat = fs.statSync(wasmPath);
  console.log(`✅ WebAssembly PoW module found: deepseek.wasm (${Math.round(stat.size / 1024)} KB)`);
} else {
  console.warn('⚠️  deepseek.wasm not found in current directory. PoW solver might fail.');
}

console.log('\n----------------------------------------');
if (hasError) {
  console.error('❌ Validation completed with critical errors.');
  process.exit(1);
} else {
  console.log('🎉 Environment validation successful! DeepTerm is ready.');
  process.exit(0);
}
