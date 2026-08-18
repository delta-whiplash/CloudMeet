import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'$lib': path.resolve(import.meta.dirname, './src/lib')
		}
	},
	test: {
		include: ['tests/unit/**/*.test.ts', 'tests/property/**/*.test.ts'],
		exclude: ['tests/e2e/**']
	}
});
