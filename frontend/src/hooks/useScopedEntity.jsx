import { useMemo } from 'react';
import { useApi } from './useApi';
import { useSession } from '../context/SessionContext';

/**
 * Mock-login only binds a role. The provider / employer / trainee pages need a
 * specific seeded entity — this hook fetches the option list, defaults to the
 * one stored on the session (or the first), persists the choice back onto the
 * session, and hands back a ready `<select>` for the topbar.
 *
 *   kind: 'provider' | 'employer' | 'trainee'
 *   → { id, name, options, loading, error, Switcher }
 */
const CFG = {
  provider: { path: '/providers', key: 'providers', idField: 'id', labelField: 'name', sessionKey: 'providerId', nameKey: 'providerName' },
  employer: { path: '/employers', key: 'employers', idField: 'name', labelField: 'name', sessionKey: 'employer', nameKey: 'employer' },
  trainee: { path: '/trainees', key: 'trainees', idField: 'id', labelField: 'name', sessionKey: 'traineeId', nameKey: 'traineeName' },
};

export function useScopedEntity(kind) {
  const active = Boolean(CFG[kind]);
  const cfg = CFG[kind] || CFG.provider; // placeholder shape when inactive
  const { session, signIn } = useSession();
  const { data, loading, error } = useApi(active ? cfg.path : null);
  const options = active ? (data && data[cfg.key]) || [] : [];

  const stored = session ? session[cfg.sessionKey] : null;
  const current = useMemo(() => {
    if (!options.length) return null;
    return options.find((o) => o[cfg.idField] === stored) || options[0];
  }, [options, stored, cfg.idField]);

  const id = current ? current[cfg.idField] : null;
  const name = current ? current[cfg.labelField] : null;

  const setId = (nextId) => {
    const opt = options.find((o) => o[cfg.idField] === nextId);
    signIn({
      ...session,
      [cfg.sessionKey]: nextId,
      [cfg.nameKey]: opt ? opt[cfg.labelField] : nextId,
    });
  };

  const Switcher =
    active && options.length > 1 ? (
      <select
        className="select"
        value={id || ''}
        onChange={(e) => setId(e.target.value)}
        aria-label={`Select ${kind}`}
      >
        {options.map((o) => (
          <option key={o[cfg.idField]} value={o[cfg.idField]}>
            {o[cfg.labelField]}
          </option>
        ))}
      </select>
    ) : null;

  return { id, name, options, loading, error, setId, Switcher };
}
