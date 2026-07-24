// @vitest-environment node

import { describe, expect, it } from 'vitest';
import viteConfig from '../../../vite.config';

describe('desktop packaging', () => {
  it('emits relative renderer assets for the packaged file URL', () => {
    expect(viteConfig).toMatchObject({ base: './' });
  });
});
