import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('schema.prisma', () => {
  it('defines document-based map tables', () => {
    const schema = fs.readFileSync(
      path.resolve(__dirname, '../backend/prisma/schema.prisma'),
      'utf8'
    );

    expect(schema).toContain('model MapDocumentRecord');
    expect(schema).toContain('documentJson Json');
    expect(schema).toContain('model MapProjectionRecord');
    expect(schema).toContain('mapVersion   String');
    expect(schema).not.toContain('model NodeDependency');
  });
});
