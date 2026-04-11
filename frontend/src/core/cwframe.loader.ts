import type { CWFrameMapPayload } from '@shared/contract';
import { fetchDefaultMap } from './cwframe.api';

export async function loadFrameMap(): Promise<CWFrameMapPayload> {
  return fetchDefaultMap();
}
