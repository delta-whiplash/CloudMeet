import { describe, it, expect } from 'vitest';
import {
	hexToRgb,
	adjustBrightness,
	adjustBrightnessHex,
	createBrandColors
} from '../../src/lib/utils/colorUtils';

describe('Color Utilities (src/lib/utils/colorUtils.ts)', () => {

	describe('hexToRgb', () => {
		it('converts valid hex strings into RGB object', () => {
			expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
			expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
		});

		it('returns default blue RGB object for invalid hex strings', () => {
			expect(hexToRgb('invalid-hex')).toEqual({ r: 59, g: 130, b: 246 });
		});
	});

	describe('adjustBrightness & adjustBrightnessHex', () => {
		it('adjusts brightness and outputs rgb string', () => {
			const rgbStr = adjustBrightness('#000000', 50);
			expect(rgbStr).toContain('rgb(');
		});

		it('adjusts brightness and outputs hex string', () => {
			const hexStr = adjustBrightnessHex('#000000', 50);
			expect(hexStr.startsWith('#')).toBe(true);
		});
	});

	describe('createBrandColors', () => {
		it('generates brand color palette object', () => {
			const palette = createBrandColors('#3b82f6');
			expect(palette.base).toBe('#3b82f6');
			expect(palette.rgb).toEqual({ r: 59, g: 130, b: 246 });
			expect(palette.light).toBeDefined();
			expect(palette.darkHex).toBeDefined();
		});
	});
});
