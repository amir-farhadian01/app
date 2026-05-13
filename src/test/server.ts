import { setupServer } from 'msw/node';
import { smokeHandlers } from './msw-handlers';

export const server = setupServer(...smokeHandlers);
