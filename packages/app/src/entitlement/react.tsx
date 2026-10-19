import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SwitchedEntitlements } from './switched';
import type { FeatureId, IEntitlementService } from './types';

const EntitlementContext = createContext<IEntitlementService>(new SwitchedEntitlements(false));

export function EntitlementProvider(props: { service: IEntitlementService; children: ReactNode }) {
  return (
    <EntitlementContext.Provider value={props.service}>
      {props.children}
    </EntitlementContext.Provider>
  );
}

/** The service itself, for code that has to pass it on (the gated loader). */
export function useEntitlementService(): IEntitlementService {
  return useContext(EntitlementContext);
}

/** True or false once known; null while the service is still answering, so a screen shows nothing locked. */
export function useFeatureAccess(feature: FeatureId): boolean | null {
  const service = useContext(EntitlementContext);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void service.hasFeatureAccess(feature).then((v) => {
      if (live) setAllowed(v);
    });
    return () => {
      live = false;
    };
  }, [service, feature]);
  return allowed;
}
