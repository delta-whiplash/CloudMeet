import fs from 'fs';
import path from 'path';

console.log('🔍 CloudMeet Deployment Verification Tool\n');

let warnings = 0;
let errors = 0;

// 1. Check wrangler.toml
const wranglerPath = path.resolve(process.cwd(), 'wrangler.toml');
if (fs.existsSync(wranglerPath)) {
	const content = fs.readFileSync(wranglerPath, 'utf8');
	console.log('✅ wrangler.toml found');

	if (!content.includes('d1_databases')) {
		console.error('❌ ERROR: D1 database binding missing in wrangler.toml');
		errors++;
	} else {
		console.log('  - D1 database binding configured');
	}

	if (!content.includes('kv_namespaces')) {
		console.warn('⚠️ WARNING: KV namespace binding missing in wrangler.toml (caching disabled)');
		warnings++;
	} else {
		console.log('  - KV namespace binding configured');
	}
} else {
	console.error('❌ ERROR: wrangler.toml not found');
	errors++;
}

// 2. Check local env vars file (.dev.vars or .env)
const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
const envPath = path.resolve(process.cwd(), '.env');

const envFile = fs.existsSync(devVarsPath) ? devVarsPath : fs.existsSync(envPath) ? envPath : null;

if (envFile) {
	console.log(`\n✅ Environment file found: ${path.basename(envFile)}`);
	const envContent = fs.readFileSync(envFile, 'utf8');
	const lines = envContent.split('\n');

	const keys = {};
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx !== -1) {
			const key = trimmed.slice(0, eqIdx).trim();
			const val = trimmed.slice(eqIdx + 1).trim();
			keys[key] = val;

			// Check for trailing newlines/quotes issues
			if (val.includes('\\n') || val.includes('\r')) {
				console.warn(`⚠️ WARNING: Variable "${key}" contains raw escape characters or carriage returns.`);
				warnings++;
			}
		}
	}

	const required = ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
	for (const reqKey of required) {
		if (!keys[reqKey]) {
			console.warn(`⚠️ WARNING: Key "${reqKey}" is missing in ${path.basename(envFile)} (remember to set it in GitHub Secrets / Wrangler)`);
			warnings++;
		} else {
			console.log(`  - ${reqKey} is set`);
		}
	}
} else {
	console.warn('\n⚠️ WARNING: Neither .dev.vars nor .env file found. Copy .env.example to .dev.vars for local testing.');
	warnings++;
}

// 3. Check schema.sql
const schemaPath = path.resolve(process.cwd(), 'schema.sql');
if (fs.existsSync(schemaPath)) {
	console.log('\n✅ schema.sql found');
} else {
	console.error('❌ ERROR: schema.sql missing');
	errors++;
}

console.log('\n--- Summary ---');
if (errors === 0 && warnings === 0) {
	console.log('🎉 Everything looks ready for deployment!');
} else {
	console.log(`Finished verification with ${errors} error(s) and ${warnings} warning(s).`);
}

process.exit(errors > 0 ? 1 : 0);
