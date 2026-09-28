import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  tag: string;
  title: string;
  icon: ReactNode;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    tag: 'ARCHITECTURE CORE',
    title: 'Modular Monolith & Work Graph',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </svg>
    ),
    description: (
      <>
        Decoupled Next.js 15 SSR presentation client coupled with an Express API gateway. The centralized Work Graph orchestrates entities across CRM, HR, Finance, Traffic Director, and Media Studio.
      </>
    ),
  },
  {
    tag: 'DATA CONTAINMENT',
    title: 'Multi-Tenant PostgreSQL Isolation',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      </svg>
    ),
    description: (
      <>
        Dynamic company resolution isolating database namespaces per tenant. Strict <code>companyId</code> validation and connection middleware guarantee zero data leakage between independent workspaces.
      </>
    ),
  },
  {
    tag: 'DISTRIBUTED EXECUTION',
    title: 'Real-Time WebSockets & BullMQ',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    description: (
      <>
        Socket.IO namespaces for instant messaging, whiteboard sync, and system alerts, backed by high-throughput Redis queues and BullMQ for resilient asynchronous worker job processing.
      </>
    ),
  },
];

function Feature({tag, title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <div className={styles.iconWrapper}>{icon}</div>
        <div className={styles.pillLabel}>{tag}</div>
        <Heading as="h3" className={styles.featureTitle}>
          {title}
        </Heading>
        <p className={styles.featureDesc}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
