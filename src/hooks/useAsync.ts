import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Run an async loader with abort-on-unmount / abort-on-rerun. `deps` controls
 * when it re-runs; pass `enabled: false` to hold off until inputs are ready.
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  enabled = true
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Something went wrong";
        setState({ data: null, loading: false, error: message });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  return { ...state, reload };
}
