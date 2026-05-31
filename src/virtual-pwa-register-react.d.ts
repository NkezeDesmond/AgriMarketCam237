declare module "virtual:pwa-register/react" {
  export type RegisterSWOptions = {
    immediate?: boolean;
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  };

  export function useRegisterSW(
    options?: RegisterSWOptions
  ): {
    needRefresh: [boolean, (v: boolean) => void];
    offlineReady: [boolean, (v: boolean) => void];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

