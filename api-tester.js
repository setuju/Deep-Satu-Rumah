#!/usr/bin/env node
import http from 'http';
import https from 'https';

const args = process.argv.slice(2);
let token = process.env.DEEPSEEK_TOKEN || '';
let baseUrl = 'http://localhost:3000';
let testType = 'all';
let prompt = 'Halo DeepSeek dari DeepTerm API Tester!';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--token' && args[i + 1]) token = args[++i];
  if (args[i] === '--url' && args[i + 1]) baseUrl = args[++i];
  if (args[i] === '--test' && args[i + 1]) testType = args[++i];
  if (args[i] === '--prompt' && args[i + 1]) prompt = args[++i];
}

console.log('🧪 DeepTerm API Tester CLI');
console.log(`Target Base URL: ${baseUrl}`);
console.log(`Token Status   : ${token ? 'Available (' + token.slice(0, 10) + '...)' : 'Missing'}`);
console.log(`Test Target    : ${testType}\n`);

async function runFetch(url, options = {}) {
  const isHttps = url.startsWith('https');
  const lib = isHttps ? https : http;
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = lib.request(
      parsed,
      {
        method: options.method || 'GET',
        headers: options.headers || {}
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function testHealth() {
  console.log('1. Testing /health endpoint...');
  try {
    const res = await runFetch(`${baseUrl}/health`);
    console.log(`   Status: ${res.status} ${res.status === 200 ? '✅' : '❌'}`);
    console.log(`   Body  :`, res.body);
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
  }
}

async function testAuthVerify() {
  console.log('\n2. Testing /auth/verify endpoint...');
  try {
    const res = await runFetch(`${baseUrl}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`   Status: ${res.status} ${res.status === 200 ? '✅' : '⚠️'}`);
    console.log(`   Body  :`, res.body);
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
  }
}

async function testFileList() {
  console.log('\n3. Testing /file/list endpoint...');
  try {
    const res = await runFetch(`${baseUrl}/file/list?dir=.`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`   Status: ${res.status} ${res.status === 200 ? '✅' : '⚠️'}`);
    if (res.body && res.body.items) {
      console.log(`   Found ${res.body.items.length} items in workspace.`);
    }
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
  }
}

async function main() {
  await testHealth();
  if (testType === 'all' || testType === 'auth') await testAuthVerify();
  if (testType === 'all' || testType === 'file') await testFileList();
  console.log('\n🏁 API testing routine complete.');
}

main().catch(console.error);
