import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '../api/client';

/**
 * useApi(path, params) → { data, error, loading, reload }
 * Re-fetches whenever `path` or the serialised `params` change. Ignores
 * responses from superseded requests.
 */
export function useApi(path, params) {
  const paramsKey = JSON.stringify(params ?? null);
  const reqId = useRef(0);
  const [state, setState] = useState({ data: null, error: null, loading: !!path });

  const load = useCallback(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    apiGet(path, params).then(
      (data) => {
        if (id === reqId.current) setState({ data, error: null, loading: false });
      },
      (error) => {
        if (id === reqId.current) setState({ data: null, error, loading: false });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
