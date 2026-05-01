"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type RatingPortalHoldContextValue = {
  clerkPortalsHeld: boolean;
  setClerkPortalsHeld: Dispatch<SetStateAction<boolean>>;
};

const RatingPortalHoldContext =
  createContext<RatingPortalHoldContextValue | null>(null);

/** Wrap `/rating` layout so the nav can temporarily unmount Clerk portals during refresh (avoids React 19 removeChild races with document.body portals). */
export function RatingPortalHoldProvider({ children }: { children: ReactNode }) {
  const [clerkPortalsHeld, setClerkPortalsHeld] = useState(false);
  const value = useMemo(
    () => ({ clerkPortalsHeld, setClerkPortalsHeld }),
    [clerkPortalsHeld],
  );
  return (
    <RatingPortalHoldContext.Provider value={value}>
      {children}
    </RatingPortalHoldContext.Provider>
  );
}

/** Returns null outside the rating layout (e.g. home page). */
export function useRatingPortalHold(): RatingPortalHoldContextValue | null {
  return useContext(RatingPortalHoldContext);
}
