/**
 * Backend Entry Point — controlled public exports.
 *
 * Import from module-specific paths for tree-shaking:
 *   import { CreateMixSessionUseCase } from './modules/mix-session';
 *
 * The wildcard re-exports below are provided for convenience but
 * consumers are encouraged to use explicit module imports.
 */

// Shared kernel
export * from './shared';

// Infrastructure
export * as infra from './infra';

// API layer
export * as api from './api';

// Domain modules (existing)
export * as modules from './modules';

// New use-case modules (explicit, controlled exports)
export * as mixSession from './modules/mix-session/index.ts';
export * as contact from './modules/contact/index.ts';
export * as health from './modules/health/index.ts';

// Bootstrap
export { buildContainer } from './bootstrap/container.ts';
export type { Container, ContainerDependencies } from './bootstrap/container.ts';

