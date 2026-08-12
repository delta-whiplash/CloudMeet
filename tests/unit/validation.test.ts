import { describe, it, expect } from 'vitest';
import { isValidEmail, validateLength, validateFields, MAX_LENGTHS } from '../../src/lib/server/validation';

describe('Validation Utilities (src/lib/server/validation.ts)', () => {

	describe('isValidEmail', () => {
		it('accepts valid email addresses', () => {
			expect(isValidEmail('user@example.com')).toBe(true);
			expect(isValidEmail('john.doe+test@subdomain.domain.co.uk')).toBe(true);
		});

		it('rejects invalid email formats', () => {
			expect(isValidEmail('')).toBe(false);
			expect(isValidEmail('plainaddress')).toBe(false);
			expect(isValidEmail('@domain.com')).toBe(false);
			expect(isValidEmail('user@.com')).toBe(false);
			expect(isValidEmail('user@domain..com')).toBe(false);
			expect(isValidEmail(null as any)).toBe(false);
			expect(isValidEmail(undefined as any)).toBe(false);
		});

		it('rejects emails exceeding RFC 5321 maximum length (254 chars)', () => {
			const longEmail = 'a'.repeat(245) + '@domain.com'; // > 254 chars
			expect(isValidEmail(longEmail)).toBe(false);
		});
	});

	describe('validateLength', () => {
		it('returns null for valid string lengths', () => {
			expect(validateLength('John Doe', 'Name', MAX_LENGTHS.name)).toBeNull();
			expect(validateLength('', 'Notes', MAX_LENGTHS.notes, false)).toBeNull();
		});

		it('returns error message when required field is empty', () => {
			expect(validateLength('', 'Name', MAX_LENGTHS.name, true)).toBe('Name is required');
			expect(validateLength('   ', 'Email', MAX_LENGTHS.email, true)).toBe('Email is required');
		});

		it('returns error message when value exceeds maximum length', () => {
			const oversized = 'x'.repeat(MAX_LENGTHS.name + 1);
			expect(validateLength(oversized, 'Name', MAX_LENGTHS.name)).toBe(
				`Name must be ${MAX_LENGTHS.name} characters or less`
			);
		});
	});

	describe('validateFields', () => {
		it('returns null if all validations pass (all nulls)', () => {
			expect(validateFields([null, null, null])).toBeNull();
		});

		it('returns the first error message encountered', () => {
			expect(validateFields([null, 'Email is invalid', 'Name is required'])).toBe('Email is invalid');
		});
	});
});
