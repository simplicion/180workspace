# Pitchin180 Product Vision & Work Graph Architecture

**Status: Approved & Active**
*This document serves as the permanent memory and source of truth for the Pitchin180 platform architecture following the major strategic pivot.*

## 1. The Core Thesis

**Pitchin180 is the Work Intelligence Network.**
It is an identity and intelligence layer where verified company activity becomes evidence of people, companies, and opportunities.

**The Fatal Flaw (What We Are NOT Building):**
Originally, Pitchin180 attempted to be an "all-in-one" ERP for startups (Slack + Jira + HRMS + Finance + CRM). Extensive adversarial market simulation proved this approach would fail due to scope bloat, lack of differentiation against incumbents (Atlassian, Slack), and inability to monetize simple utility features. Furthermore, user-generated "Proof of Work" (uploading your own screenshots) leads to a trust paradox (spam vs. authenticity).

**The Solution:**
Instead of replacing Jira and GitHub, Pitchin180 connects to them. "180 Workspace" acts as an ingestion engine to build an internal graph of raw company activity. Pitchin180 then projects this activity into safe, evidence-backed professional signals. 

*"Raw data stays private. Evidence comes out."*

## 2. The 5-Tab Information Architecture

The UI is radically simplified to reflect intelligence, not project management:

1. **Intelligence (Home/Search):** A powerful search interface to query the Work Graph for talent and companies based on real evidence.
2. **Companies (Startup Graph):** Directory of verified startups showing aggregated intelligence signals (velocity, tech stack), rather than marketing fluff.
3. **Talent (People Graph):** Proof-of-Work profiles showing validated signals (e.g., "Shipped 40 Backend Features") rather than self-written resumes.
4. **Connections (Workspace):** Where users and companies manage integrations (GitHub, Jira, HRMS) to feed the graph.
5. **Network (Community):** A feed of validated achievements and major project milestones auto-generated from the Work Graph.

## 3. Application Architecture (Physical Separation)

Because Pitchin180 (Public Intelligence) and 180 Workspace (Private Ingestion) serve fundamentally different security boundaries and user modes, they must be physically separated in the monorepo:

- `apps/pitchin180-web`: Next.js frontend for the public graph, profiles, talent search, and community.
- `apps/workspace-web`: Next.js frontend for the private ERP, HR, and integration settings.
- `apps/pitchin180-backend`: Express HTTP backend serving public graph queries and identity matching.
- `apps/workspace-backend`: Express HTTP backend serving private tenant operations, ingestion, and heavy calculations.

*Note: Infrastructure and UI components (like messaging/notifications) are duplicated or moved to shared packages so each app can function independently.*

## 4. The Work Graph Schema (v1)

### Graph Nodes
- **`PERSON_NODE`**: The human identity. Starts as `UNCLAIMED` (created via HR sync) and becomes `CLAIMED` when linked to a Pitchin account via strong email match or company confirmation.
- **`COMPANY_NODE`**: The verified startup.
- **`PROJECT_NODE`**: Logical grouping (e.g., Jira Epic).
- **`WORK_ITEM_NODE`**: Granular, atomic work (e.g., Commit, PR, Ticket). *Always completely private.*
- **`CAPABILITY_NODE`**: A demonstrated skill (e.g., "Node.js").
- **`DATA_SOURCE_NODE`**: External system of origin (e.g., GitHub, Zoho).

### Graph Edges (with Provenance)
Edges carry `Provenance` (Source, Method, Timestamp) and `Confidence` (HIGH = system verified, MEDIUM = company confirmed, LOW = user claimed).
- `EMPLOYED_BY` (Person -> Company)
- `CONTRIBUTED_TO` (Person -> Project)
- `WORKED_ON` (Person -> Work Item)
- `DEMONSTRATED` (Person -> Capability)

## 5. The Privacy & Projection Security Model

This is the ultimate security boundary:
- **Internal Graph (Private):** Contains raw data (Jira summaries, commit hashes, internal IDs, client names, financials). **This data NEVER leaves the company's private tenant.**
- **Proof-of-Work Projection (Public):** A read-only, aggregated view generated from the internal graph. It strips raw data and returns verifiable signals. Example: It projects "Completed 80 work items (HIGH confidence)" instead of publishing "Fixed auth bug in Razorpay gateway".

## 6. Execution Directives for Agents
- Do not build standard ERP features (invoicing, attendance) in the Pitchin app.
- Always implement the strict privacy boundary between Workspace (raw) and Pitchin (projection).
- Never trust user-input data over system-synced data. Provenance is king.
