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
          <Link className={styles.primaryBtn} to="/docs/intro">
            Explore Documentation <span>→</span>
          </Link>
          <Link className={styles.secondaryBtn} to="/docs/SYSTEM_ARCHITECTURE">
            System Architecture
          </Link>
          <Link className={styles.secondaryBtn} to="/docs/API_DOCUMENTATION">
            API Reference
          </Link>
        </div>
        <div className={styles.tagsRow}>
          <span className={styles.tagPill}>Modular Monolith</span>
          <span className={styles.tagPill}>Multi-Tenant PostgreSQL</span>
          <span className={styles.tagPill}>Socket.IO Real-Time</span>
          <span className={styles.tagPill}>BullMQ Queues</span>
          <span className={styles.tagPill}>Zero-Trust RBAC</span>
        </div>
      </div>
    </header>
  );
}

const navModules = [
  {
    title: 'Platform Architecture',
    desc: 'Modular Monolith pattern, decoupled Next.js SSR and Node.js REST API, reverse proxy flow and micro-routing.',
    link: '/docs/SYSTEM_ARCHITECTURE',
    icon: '⚡',
  },
  {
    title: 'Multitenancy & Database',
    desc: 'Dynamic company-db resolution, isolated PostgreSQL namespaces, relational integrity, and Prisma schema.',
    link: '/docs/DATABASE_SCHEMA',
    icon: '🗄️',
  },
  {
    title: 'REST API & WebSockets',
    desc: 'Complete endpoint catalog, standardized JSON contracts, request interceptors, and real-time event namespaces.',
    link: '/docs/API_DOCUMENTATION',
    icon: '📡',
  },
  {
    title: 'Security & Enterprise RBAC',
    desc: 'Role-based access hierarchies, JWT dual-token flow, companyId verification, and mutation audit logs.',
    link: '/docs/AUTHENTICATION_AND_SECURITY',
    icon: '🛡️',
  },
  {
    title: 'Local Development Runbook',
    desc: 'Monorepo pnpm workflows, Docker orchestration, environment variable blueprints, and hot reload setup.',
    link: '/docs/getting-started/local-development',
    icon: '💻',
  },
  {
    title: 'Work Graph & Business Logic',
    desc: 'Relational data flow connecting CRM, HR, Finance, Invoicing, Traffic Director, and Media Studio.',
    link: '/docs/BUSINESS_LOGIC',
    icon: '🔄',
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
