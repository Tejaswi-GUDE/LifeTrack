import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';
import { useApi } from '../../hooks/useApi';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';

/* ---------- formatting helpers ---------- */
const pct1 = (v) => (v == null ? '—' : `${v}%`);
const pctInt = (v) => (v == null ? '—' : `${Math.round(v)}%`);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const placementColor = (v) =>
  v == null ? undefined : v >= 75 ? 'var(--teal)' : v < 50 ? 'var(--brick)' : undefined;

const REASON_COLOR = {
  skill_mismatch: 'var(--ochre)',
  insufficient_vacancies: 'var(--slate-30)',
  salary_mismatch: 'var(--brick)',
  interview_failure: 'var(--brick)',
  location_barrier: 'var(--slate-30)',
  further_education: 'var(--teal)',
  candidate_preference: 'var(--slate-30)',
  employer_rejection: 'var(--brick)',
  training_engagement_issue: 'var(--brick)',
  other: 'var(--slate-30)',
  unclassified: 'var(--slate-30)',
};

/* ---------- scope filters injected into the topbar ---------- */
function ScopeFilters({ stateVal, districtVal, verifiedOnly, options, onState, onDistrict, onVerified }) {
  return (
    <>
      <select className="select" value={stateVal} onChange={(e) => onState(e.target.value)} aria-label="State">
        <option value="">All states</option>
        {options.states.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        className="select"
        value={districtVal}
        onChange={(e) => onDistrict(e.target.value)}
        aria-label="District"
      >
        <option value="">All districts</option>
        {options.districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <div className="seg" role="group" aria-label="Confidence filter">
        <button type="button" className={!verifiedOnly ? 'active' : ''} onClick={() => onVerified(false)}>
          All data
        </button>
        <button type="button" className={verifiedOnly ? 'active' : ''} onClick={() => onVerified(true)}>
          Verified only
        </button>
      </div>
    </>
  );
}

/* ---------- confidence mix cell ---------- */
function ConfidenceMix({ mix }) {
  const parts = [];
  if (mix.high) parts.push(
    <Badge key="h" tone="teal" fill="outline">
      {mix.high}H
    </Badge>,
  );
  if (mix.medium) parts.push(
    <Badge key="m" tone="ochre" fill="outline">
      {mix.medium}M
    </Badge>,
  );
  if (mix.low) parts.push(
    <Badge key="l" tone="slate" fill="solid">
      {mix.low}L
    </Badge>,
  );
  return <span style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>{parts}</span>;
}

/* ---------- KPI card ---------- */
function Kpi({ label, value, children }) {
  return (
    <div className="kpi">
      <div className="k-label">{label}</div>
      <div className="k-value">{value}</div>
      <div className="k-conf">{children}</div>
    </div>
  );
}

const ConfDots = () => (
  <span className="conf-dots">
    <span style={{ background: 'var(--teal)' }} />
    <span style={{ background: 'var(--ochre)' }} />
    <span style={{ background: 'var(--slate-30)' }} />
  </span>
);

/* ---------- loading skeleton (exact shape) ---------- */
function DashboardSkeleton() {
  return (
    <>
      <div className="alerts-row">
        <Skeleton height={54} radius="var(--radius-md)" />
        <Skeleton height={54} radius="var(--radius-md)" />
      </div>
      <div className="kpi-strip">
        {[0, 1, 2, 3].map((i) => (
          <div className="kpi" key={i}>
            <Skeleton width="55%" height={12} />
            <div style={{ height: 12 }} />
            <Skeleton width="70%" height={30} />
            <div style={{ height: 14 }} />
            <Skeleton width="90%" height={11} />
          </div>
        ))}
      </div>
      <div className="two-col">
        <div className="card">
          <Skeleton width="40%" height={17} />
          <div style={{ height: 16 }} />
          <Skeleton height={190} radius="var(--radius-md)" />
        </div>
        <div className="two-col-right">
          <div className="card">
            <Skeleton width="55%" height={15} />
            <div style={{ height: 14 }} />
            <Skeleton height={70} />
          </div>
          <div className="card">
            <Skeleton width="50%" height={15} />
            <div style={{ height: 14 }} />
            <Skeleton height={70} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ======================================================================== */
export default function GovernmentDashboard() {
  const navigate = useNavigate();
  const [stateVal, setStateVal] = useState('');
  const [districtVal, setDistrictVal] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [perfMode, setPerfMode] = useState('byProvider');
  const [sortDir, setSortDir] = useState('asc');

  const params = useMemo(
    () => ({
      state: stateVal || undefined,
      district: districtVal || undefined,
      verifiedOnly: verifiedOnly ? 'true' : undefined,
    }),
    [stateVal, districtVal, verifiedOnly],
  );

  const { data, error, loading, reload } = useApi('/dashboards/government', params);
  const options = data?.scopeOptions || { states: [], districts: [] };

  useTopbarActions(
    <ScopeFilters
      stateVal={stateVal}
      districtVal={districtVal}
      verifiedOnly={verifiedOnly}
      options={options}
      onState={(v) => {
        setStateVal(v);
        setDistrictVal('');
      }}
      onDistrict={(v) => setDistrictVal(v)}
      onVerified={(v) => setVerifiedOnly(v)}
    />,
    [stateVal, districtVal, verifiedOnly, options.states.length, options.districts.length],
  );

  if (error) {
    return (
      <ErrorState message="Couldn't load outcome data for this scope. Retry." onRetry={reload} />
    );
  }
  if (loading && !data) return <DashboardSkeleton />;
  if (!data) return null;

  const { totals, kpis, performance, skillGaps, nonPlacement, alerts } = data;
  const emptyScope = totals.certified === 0;

  const rows = perfMode === 'byProvider' ? performance.byProvider : performance.byDistrict;
  const sortedRows = [...rows].sort((a, b) => {
    const av = a.placementRate ?? -1;
    const bv = b.placementRate ?? -1;
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const drillTo = (row) => {
    if (perfMode === 'byProvider') navigate(`/government/provider/${row.id}`);
    else navigate(`/government/district/${encodeURIComponent(row.id)}`);
  };

  const pc = kpis.placementRate.confidence;
  const employedTotal = pc.verified + pc.selfReported + pc.needsReview;
  const placementConfText = emptyScope
    ? 'No trainees in this scope yet'
    : `${employedTotal} of ${kpis.placementRate.denominator} employed — ${pc.verified} verified` +
      (pc.selfReported ? `, ${pc.selfReported} self-reported` : '') +
      (pc.needsReview ? `, ${pc.needsReview} needs review` : '');

  return (
    <>
      {alerts.length > 0 && (
        <div className="alerts-row">
          {alerts.map((a) => (
            <Alert key={a.id} tone={a.tone} title={a.title}>
              {a.body}
            </Alert>
          ))}
        </div>
      )}

      <div className="kpi-strip">
        <Kpi label="Placement Rate" value={emptyScope ? '—' : pct1(kpis.placementRate.value)}>
          <ConfDots />
          {placementConfText}
        </Kpi>
        <Kpi label="Retention Rate (any active job)" value={emptyScope ? '—' : pct1(kpis.retentionRate.value)}>
          {emptyScope
            ? 'No trainees in this scope yet'
            : `${kpis.retentionRate.numerator} of ${kpis.retentionRate.denominator} ever-employed trainees currently active`}
        </Kpi>
        <Kpi label="Avg. Wage Growth" value={emptyScope ? '—' : pct1(kpis.wageGrowth.value)}>
          {emptyScope
            ? 'No trainees in this scope yet'
            : `Across ${kpis.wageGrowth.sampleSize} trainees with 2+ income checkpoints`}
        </Kpi>
        <Kpi label="Avg. Skill Match Score" value={emptyScope ? '—' : pct1(kpis.skillMatch.value)}>
          {emptyScope
            ? 'No trainees in this scope yet'
            : `Across ${kpis.skillMatch.sampleSize} employed / self-employed trainees`}
        </Kpi>
      </div>

      <div className="two-col">
        {/* left — provider / district performance */}
        <div className="card">
          <div className="panel-head">
            <h2>Provider &amp; District Performance</h2>
            <Tabs
              items={[
                { value: 'byProvider', label: 'By Provider' },
                { value: 'byDistrict', label: 'By District' },
              ]}
              value={perfMode}
              onChange={setPerfMode}
              ariaLabel="Group performance by"
            />
          </div>

          {rows.length === 0 ? (
            <EmptyState message="No trainees in this scope yet." />
          ) : (
            <Table wrap>
              <Table.Head>
                <Table.Row>
                  <Table.HeadCell>{perfMode === 'byProvider' ? 'Provider' : 'District'}</Table.HeadCell>
                  {perfMode === 'byProvider' ? (
                    <Table.HeadCell>District</Table.HeadCell>
                  ) : (
                    <Table.HeadCell numeric>Providers</Table.HeadCell>
                  )}
                  <Table.HeadCell numeric>Trainees</Table.HeadCell>
                  <Table.HeadCell
                    numeric
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    style={{ cursor: 'pointer' }}
                    title="Sort by placement rate"
                  >
                    Placement <span className="sort-ic">{sortDir === 'asc' ? '▾' : '▴'}</span>
                  </Table.HeadCell>
                  <Table.HeadCell numeric>Skill Match</Table.HeadCell>
                  <Table.HeadCell numeric>Confidence mix</Table.HeadCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {sortedRows.map((row) => (
                  <Table.Row key={row.id} onClick={() => drillTo(row)}>
                    <Table.Cell>{row.name}</Table.Cell>
                    {perfMode === 'byProvider' ? (
                      <Table.Cell>{row.district}</Table.Cell>
                    ) : (
                      <Table.Cell numeric>{row.providers}</Table.Cell>
                    )}
                    <Table.Cell numeric>{row.trainees}</Table.Cell>
                    <Table.Cell numeric style={{ color: placementColor(row.placementRate) }}>
                      {pctInt(row.placementRate)}
                    </Table.Cell>
                    <Table.Cell numeric>{pctInt(row.skillMatch)}</Table.Cell>
                    <Table.Cell numeric>
                      <ConfidenceMix mix={row.confidenceMix} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>

        {/* right — skill gap + non-placement reasons */}
        <div className="two-col-right">
          <Card
            title="Skill Gap Intelligence"
            subtitle="Most frequently missing skills, certified trainees"
          >
            {skillGaps.length === 0 ? (
              <EmptyState message="No skill gaps detected in this scope." />
            ) : (
              skillGaps.map((g) => (
                <div className="skillgap-row" key={g.skill}>
                  <div>
                    <div className="sg-name">{g.skill}</div>
                    <div className="sg-courses">{g.courses.join(', ')}</div>
                  </div>
                  <span className="skillgap-count">
                    {g.affectedTrainees} trainee{g.affectedTrainees === 1 ? '' : 's'}
                  </span>
                </div>
              ))
            )}
          </Card>

          <Card
            title="Non-Placement Reasons"
            subtitle="Among currently unplaced / non-responsive trainees"
          >
            {nonPlacement.total === 0 ? (
              <EmptyState message="No unplaced or non-responsive trainees in this scope." />
            ) : (
              <>
                <div className="cause-bar">
                  {nonPlacement.reasons.map((r) => (
                    <div
                      key={r.label}
                      style={{
                        width: `${(r.count / nonPlacement.total) * 100}%`,
                        background: REASON_COLOR[r.label] || 'var(--slate-30)',
                      }}
                    />
                  ))}
                </div>
                <div className="cause-legend">
                  {nonPlacement.reasons.map((r) => (
                    <span key={r.label}>
                      <span className="dot" style={{ background: REASON_COLOR[r.label] || 'var(--slate-30)' }} />
                      {r.displayLabel}
                      {r.source === 'inferred' ? ' (inferred)' : ''} — {r.count}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <footer className="gov-note">
        Data as of {fmtDate(data.generatedAt)} · {totals.trained} trainees tracked across {totals.providers}{' '}
        provider{totals.providers === 1 ? '' : 's'}, {totals.districts} district{totals.districts === 1 ? '' : 's'}
      </footer>
    </>
  );
}
