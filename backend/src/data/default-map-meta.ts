import * as fs from 'fs';
import * as path from 'path';

type DefaultMapMeta = {
  name: string;
  slug: string;
  version: string | number;
};

export function readDefaultMapMeta(): DefaultMapMeta {
  const filePath = path.join(process.cwd(), 'src/data/map.default.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as Partial<DefaultMapMeta>;

  return {
    name: typeof data.name === 'string' && data.name.trim().length > 0 ? data.name : 'Default Map',
    slug: typeof data.slug === 'string' && data.slug.trim().length > 0 ? data.slug : 'default',
    version: data.version ?? '0.0.0',
  };
}
