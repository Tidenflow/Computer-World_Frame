import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('backend app route cleanup', () => {
  it('does not register the legacy node-first API route', () => {
    const appSource = fs.readFileSync(
      path.resolve(__dirname, '../backend/src/app.ts'),
      'utf8'
    );

    expect(appSource).not.toContain("import nodeRouter from './routers/node.router'");
    expect(appSource).not.toContain("app.use('/api/nodes', nodeRouter)");
  });
});
