import { CheckCircle2, Target, Wallet } from 'lucide-react';
import { Modal, Button } from '@/components/shared';

interface ScenarioInfoModalProps {
  type: 'SPEND BASED' | 'GOAL BASED' | string;
  onClose: () => void;
  onSelect?: (type: 'SPEND BASED' | 'GOAL BASED') => void;
  showHelpMeChoose?: boolean;
}

const bullets = {
  spend: [
    'Set a total target spend amount',
    'System optimizes channel allocation within budget',
    'Best when you have a fixed budget constraint',
    'Returns optimized spend breakdown with projected ROI',
  ],
  goal: [
    'Set a target KPI (Incremental Sales, ROI, Revenue)',
    'Define your desired target value',
    'System determines optimal budget needed',
    'Best when you have a specific performance target',
  ],
};

export function ScenarioInfoModal({ type, onClose, onSelect, showHelpMeChoose }: ScenarioInfoModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      size={showHelpMeChoose ? 'lg' : 'md'}
      title={
        showHelpMeChoose
          ? 'Help me choose'
          : type === 'SPEND BASED'
            ? 'Spend based scenario'
            : 'Goal based scenario'
      }
      subtitle={
        showHelpMeChoose
          ? 'Pick the optimization style that fits your planning need'
          : undefined
      }
      footer={
        <Button variant="secondary" onClick={onClose}>Close</Button>
      }
    >
      {showHelpMeChoose ? (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            icon={<Wallet size={18} />}
            heading="Spend based"
            sub="You have a fixed budget"
            body="Optimize how a defined budget is distributed across channels for maximum impact."
            bullets={bullets.spend}
            onSelect={onSelect ? () => onSelect('SPEND BASED') : undefined}
          />
          <Card
            icon={<Target size={18} />}
            heading="Goal based"
            sub="You have a performance target"
            body="Find the optimal spend required to hit a specific KPI like incremental sales or ROI."
            bullets={bullets.goal}
            onSelect={onSelect ? () => onSelect('GOAL BASED') : undefined}
          />
        </div>
      ) : (
        <div className="p-6">
          <p className="text-[14px] text-[var(--ink-700)] leading-relaxed mb-4">
            {type === 'SPEND BASED' ? (
              <>
                A <strong>Spend Based</strong> scenario lets you define a total budget and optimize
                how it gets distributed across channels and sub-channels.
              </>
            ) : (
              <>
                A <strong>Goal Based</strong> scenario lets you define a KPI target and find the
                optimal spend required to achieve it.
              </>
            )}
          </p>
          <ul className="space-y-2 mt-4">
            {(type === 'SPEND BASED' ? bullets.spend : bullets.goal).map((b) => (
              <li key={b} className="flex gap-2.5 items-start text-[13px] text-[var(--ink-700)]">
                <CheckCircle2 size={15} className="text-[var(--brand)] flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function Card({
  icon,
  heading,
  sub,
  body,
  bullets,
  onSelect,
}: {
  icon: React.ReactNode;
  heading: string;
  sub: string;
  body: string;
  bullets: string[];
  onSelect?: () => void;
}) {
  return (
    <div className="border border-[var(--border)] rounded-lg p-5 hover:border-[var(--brand)] hover:shadow-sm transition-all flex flex-col">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-md bg-[var(--brand-50)] flex items-center justify-center text-[var(--brand)]">
          {icon}
        </div>
        <div>
          <div className="text-[14px] font-semibold text-[var(--ink-900)]">{heading}</div>
          <div className="text-[11px] text-[var(--ink-500)]">{sub}</div>
        </div>
      </div>
      <p className="text-[12.5px] text-[var(--ink-700)] mb-3 leading-relaxed">{body}</p>
      <ul className="space-y-1.5 flex-1">
        {bullets.map((b) => (
          <li key={b} className="flex gap-1.5 items-start text-[11.5px] text-[var(--ink-500)]">
            <span className="text-[var(--brand)] mt-0.5">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {onSelect && (
        <Button onClick={onSelect} variant="primary" size="sm" className="mt-4 w-full">
          Choose {heading}
        </Button>
      )}
    </div>
  );
}
