import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroGlow} />
      <div className="container">
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          WORK GRAPH PLATFORM • v2.4 BLUEPRINT
        </div>
        <Heading as="h1" className={styles.heroTitle}>
          180 <span className={styles.gradientText}>Documentation</span>
        </Heading>
        <p className={styles.heroSubtitle}>
          Enterprise Engineering Blueprints, Work Graph Architecture, Multi-Tenant Database Schemas, and Developer Runbooks for the 180workspace Platform.
        </p>
        <div className={styles.buttons}>
          <Link className={styles.primaryBtn} to="/docs/01-platform-overview">
            Explore Documentation <span>→</span>
          </Link>
          <Link className={styles.secondaryBtn} to="/docs/products/180-workspace/overview">
            180 Workspace
          </Link>
          <Link className={styles.secondaryBtn} to="/docs/products/180-core/overview">
            180 Core
          </Link>
        </div>
        <div className={styles.tagsRow}>
          <span className={styles.tagPill}>Work Graph Architecture</span>
          <span className={styles.tagPill}>Sovereign Identity (@username)</span>
          <span className={styles.tagPill}>1-Click Pay Rails</span>
          <span className={styles.tagPill}>Edge Cloaking</span>
          <span className={styles.tagPill}>Multi-Tenant RBAC</span>
        </div>
      </div>
    </header>
  );
}

const navModules = [
  {
    title: 'Platform Overview & Purpose',
    desc: 'High-level introduction to the sovereign business platform vision, architecture, and multi-tenant security.',
    link: '/docs/01-platform-overview',
    icon: '🌐',
  },
  {
    title: 'The Sovereign Work Graph',
    desc: 'Autonomous cross-application event propagation connecting ads, leads, media, and payments.',
    link: '/docs/03-work-graph-architecture',
    icon: '⚡',
  },
  {
    title: '180 Workspace Suite',
    desc: 'Modular CRM, sales pipeline, HR team directory, multi-currency invoicing, and cloud asset storage.',
    link: '/docs/products/180-workspace/overview',
    icon: '💼',
  },
  {
    title: '180 Social Studio',
    desc: 'AI script director, front-camera teleprompter, 1-click multi-platform publishing, and viral Auto-DM lead capture.',
    link: '/docs/products/180-social-studio/overview',
    icon: '🎬',
  },
  {
    title: '180 Core (Auth & Pay)',
    desc: 'Universal login with WhatsApp 1-Tap OTP, 1-Click checkout bottom sheets, and BYOG payment gateway rails.',
    link: '/docs/products/180-core/overview',
    icon: '💳',
  },
  {
    title: '180 Traffic Director',
    desc: 'Sub-millisecond Cloudflare edge cloaking, threat intelligence bot defense, and dynamic macro attribution.',
    link: '/docs/products/180-traffic-director/overview',
    icon: '🛡️',
  },
];

function QuickNavSection() {
  return (
    <section className={styles.quickNavSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Engineering Specifications & Blueprints
          </Heading>
          <p className={styles.sectionSubtitle}>
            Jump straight into platform documentation, service boundaries, and implementation guides.
          </p>
        </div>
        <div className={styles.grid}>
          {navModules.map((item, idx) => (
            <Link key={idx} to={item.link} className={styles.navCard}>
              <div>
                <div className={styles.cardIcon}>{item.icon}</div>
                <div className={styles.cardTitle}>{item.title}</div>
                <div className={styles.cardDesc}>{item.desc}</div>
              </div>
              <div className={styles.cardLinkText}>
                View Guide <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="180 Documentation | Platform Architecture & Engineering Guides"
      description="Internal engineering blueprints, work graph architecture, database models, and developer guides for the 180workspace platform.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <QuickNavSection />
      </main>
    </Layout>
  );
}
