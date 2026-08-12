import { describe, it } from 'vitest';
import fc from 'fast-check';
import { isValidEmail, validateLength } from '../../src/lib/server/validation';
import { formatDateLocal, createFormatters } from '../../src/lib/utils/dateFormatters';

describe('Property-Based Testing (fast-check)', () => {

	it('isValidEmail never throws unhandled errors on arbitrary strings', () => {
		fc.assert(
			fc.property(fc.string(), (str) => {
				const result = isValidEmail(str);
				return typeof result === 'boolean';
			})
		);
	});

	it('validateLength never throws unhandled errors on arbitrary strings & numbers', () => {
		fc.assert(
			fc.property(fc.string(), fc.integer({ min: 1, max: 10000 }), fc.boolean(), (val, maxLen, req) => {
				const res = validateLength(val, 'Field', maxLen, req);
				return res === null || typeof res === 'string';
			})
		);
	});

	it('formatDateLocal produces valid YYYY-MM-DD format for any Date', () => {
		fc.assert(
			fc.property(fc.date({ min: new Date('1970-01-01'), max: new Date('2099-12-31') }), (d) => {
				if (isNaN(d.getTime())) return true;
				const formatted = formatDateLocal(d);
				return /^\d{4}-\d{2}-\d{2}$/.test(formatted);
			})
		);
	});
});
