import { env } from '$env/dynamic/private';
import { serveFile } from '$lib/server/static-files';
import type { RequestHandler } from './$types';

const root = () => env.DOVEARRIVO_BASEMAP_DIR ?? 'data/basemap';

export const GET: RequestHandler = ({ params, request }) => serveFile(root(), params.path, request);
export const HEAD: RequestHandler = ({ params, request }) => serveFile(root(), params.path, request);
