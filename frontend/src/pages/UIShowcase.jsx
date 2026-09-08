import { useState } from 'react';
import FoundationFrame from './FoundationFrame';
import {
  Button,
  Card,
  Badge,
  StatusBadge,
  RiskBadge,
  Input,
  Select,
  Table,
  Tabs,
  Modal,
  Drawer,
  Tooltip,
  Dropdown,
  Alert,
  InsightPanel,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonText,
} from '../components/ui';

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-serif text-h2 mb-3">{title}</h2>
      <Card>
        <div className="flex flex-wrap gap-3 items-start">{children}</div>
      </Card>
    </section>
  );
}

export default function UIShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState('provider');

  return (
    <FoundationFrame>
      <h1 className="font-serif text-h1 mb-1">UI primitives</h1>
      <p className="text-body-sm text-slate mb-6">
        Every component below is styled from the approved tokens.css + Design System. This page is a build-time
        check, not a product screen.
      </p>

      <Section title="Buttons">
        <Button variant="primary">Approve intervention</Button>
        <Button variant="secondary">View details</Button>
        <Button variant="ghost">Add note</Button>
        <Button variant="destructive">Dispute claim</Button>
        <Button variant="secondary" size="sm">
          Small
        </Button>
        <Button variant="primary" loading>
          Saving
        </Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
      </Section>

      <Section title="Badges (generic)">
        <Badge tone="teal" fill="solid" glyph="●">
          Verified
        </Badge>
        <Badge tone="teal" fill="outline">
          Self-reported
        </Badge>
        <Badge tone="teal" fill="dashed" glyph="⚑">
          Needs review
        </Badge>
        <Badge tone="brick" fill="solid">
          High risk
        </Badge>
        <Badge tone="ochre" fill="outline">
          Partial match
        </Badge>
        <Badge tone="slate" fill="solid">
          Neutral
        </Badge>
        <Badge tone="plum" fill="outline">
          System insight
        </Badge>
      </Section>

      <Section title="StatusBadge (status × confidence)">
        <StatusBadge status="employed" provenance="verified" />
        <StatusBadge status="employed" provenance="self_reported" />
        <StatusBadge status="employed" provenance="needs_review" />
        <StatusBadge status="self_employed" confidence="high" />
        <StatusBadge status="job_lost" provenance="verified" />
        <StatusBadge status="unemployed" confidence="medium" />
        <StatusBadge status="not_responding" confidence="low" />
        <StatusBadge status="employed" confidence="medium" showConfidence />
      </Section>

      <Section title="RiskBadge — compact bar">
        <RiskBadge score={85} />
        <RiskBadge score={55} />
        <RiskBadge score={12} />
      </Section>

      <Section title="RiskBadge — expanded (factor list always visible)">
        <div style={{ maxWidth: 460 }}>
          <RiskBadge
            variant="expanded"
            title="Outcome Risk"
            score={85}
            caption="Computed 1 day ago"
            factors={[
              { label: 'No placement 52 days after certification', points: 30 },
              { label: 'Missed most recent follow-up engagement', points: 15 },
              { label: 'Assessment score 42% (below 50%)', points: 20 },
              { label: 'Attendance 64% (below 70%)', points: 20 },
            ]}
          />
        </div>
      </Section>

      <Section title="Inputs & Select">
        <div style={{ display: 'grid', gap: 16, maxWidth: 320, width: '100%' }}>
          <Input label="Employer name" placeholder="e.g. BrightRetail Pvt Ltd" />
          <Input label="Monthly income" defaultValue="14000" size="lg" />
          <Input label="Join date" error="Enter a date on or after the certification date." defaultValue="bad" />
          <Input label="Case note" multiline placeholder="What happened on this contact?" />
          <Select
            label="District"
            size="field"
            options={[
              { value: '', label: 'All districts' },
              { value: 'ranchi', label: 'Ranchi' },
              { value: 'patna', label: 'Patna' },
            ]}
          />
        </div>
      </Section>

      <Section title="Tabs (segmented control)">
        <Tabs
          items={[
            { value: 'provider', label: 'By Provider' },
            { value: 'district', label: 'By District' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <span className="text-body-sm text-slate">selected: {tab}</span>
      </Section>

      <Section title="Table">
        <Table wrap>
          <Table.Head>
            <Table.Row>
              <Table.HeadCell>Provider</Table.HeadCell>
              <Table.HeadCell>District</Table.HeadCell>
              <Table.HeadCell numeric>Trainees</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row onClick={() => {}}>
              <Table.Cell>Ranchi Skill Mission Center</Table.Cell>
              <Table.Cell>Ranchi</Table.Cell>
              <Table.Cell numeric>4</Table.Cell>
              <Table.Cell>
                <StatusBadge status="employed" provenance="verified" />
              </Table.Cell>
            </Table.Row>
            <Table.Row selected onClick={() => {}}>
              <Table.Cell>Patna Livelihood Institute</Table.Cell>
              <Table.Cell>Patna</Table.Cell>
              <Table.Cell numeric>3</Table.Cell>
              <Table.Cell>
                <StatusBadge status="unemployed" confidence="medium" />
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Section>

      <Section title="Alert">
        <div style={{ display: 'grid', gap: 10, width: '100%' }}>
          <Alert tone="risk" title="Ranchi placement rate down 8 points vs. previous cohort">
            Driven mainly by skill mismatch in Data Entry &amp; Office Assistant.
          </Alert>
          <Alert tone="warning" title="2 employer verifications pending over 14 days" />
          <Alert tone="positive" title="Cohort placement rate up 3.2 points this month" />
        </div>
      </Section>

      <Section title="Insight panel (the only place --plum appears)">
        <InsightPanel basis="Based on: skill match unavailable (no job yet), course skill-gap rollup, 1 similar case this cohort.">
          Bridge Course Referral — Advanced Excel. Root cause is skill mismatch (inferred), and MS Excel is the most
          frequently missing skill in this cohort.
        </InsightPanel>
      </Section>

      <Section title="Overlays">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
          Open drawer
        </Button>
        <Tooltip content="Precise timestamp: 8 Sep 2026, 14:32 IST">
          <Button variant="ghost">Hover for tooltip</Button>
        </Tooltip>
        <Dropdown
          label="Actions"
          items={[
            { label: 'Send verification request', onSelect: () => {} },
            { label: 'Log case note', onSelect: () => {} },
            { separator: true },
            { label: 'Dispute claim', danger: true, onSelect: () => {} },
          ]}
        />
      </Section>

      <Section title="Loading / empty / error states">
        <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 420 }}>
          <div>
            <Skeleton height={28} width="40%" />
            <div style={{ height: 8 }} />
            <SkeletonText lines={3} />
          </div>
          <EmptyState message="No follow-up responses yet for this checkpoint." action={{ label: 'Send reminder now', onClick: () => {} }} />
          <ErrorState message="Couldn't load this trainee's records. Retry." onRetry={() => {}} />
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Approve intervention"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Approve intervention
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          Approving will create the intervention record and set its status to in progress. The counsellor review
          status updates immediately.
        </p>
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Case detail">
        <p style={{ marginTop: 0 }}>Drawer surface for contextual detail off a list row.</p>
        <SkeletonText lines={5} />
      </Drawer>
    </FoundationFrame>
  );
}
