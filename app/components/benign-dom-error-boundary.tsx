"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { recoverKey: number };

function isBenignRemoveChildError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  if (error.name !== "NotFoundError") return false;
  const msg = error.message ?? "";
  return /removeChild|remove child|not a child|Failed to execute 'removeChild'/i.test(
    msg,
  );
}

/**
 * React 19 + Clerk portals can throw NotFoundError on removeChild during
 * Strict Mode double-mount or when auth subtree reconciles next to a large
 * sibling update. Functionality is unaffected; this boundary recovers quietly.
 */
export class BenignDomErrorBoundary extends Component<Props, State> {
  state: State = { recoverKey: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> | null {
    if (isBenignRemoveChildError(error)) {
      return { recoverKey: Date.now() };
    }
    return null;
  }

  override componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    if (isBenignRemoveChildError(error)) {
      return;
    }
    console.error(error, errorInfo.componentStack);
  }

  override render() {
    /* key scopes remount to this subtree only (never wrap the whole app). */
    return (
      <span key={this.state.recoverKey} className="contents">
        {this.props.children}
      </span>
    );
  }
}
