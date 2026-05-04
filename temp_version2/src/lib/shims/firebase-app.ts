/**
 * firebase/app shim
 * Stubs out Firebase app initialization — not needed in production.
 */

let _app: any = null;

export function initializeApp(config: any, name?: string) {
  _app = { config, name: name || '[DEFAULT]', options: config };
  return _app;
}

export function getApp(_name?: string) {
  return _app || initializeApp({});
}

export function getApps() {
  return _app ? [_app] : [];
}

export function deleteApp(_app: any) {
  return Promise.resolve();
}

export default { initializeApp, getApp, getApps, deleteApp };
