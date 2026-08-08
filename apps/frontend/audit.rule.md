# 180 Workspace Idea Audit Framework

This document outlines the strict criteria and rules used to evaluate any new feature prompt or idea for the 180 Workspace platform. Every idea must be analyzed against this framework before writing any code.

## 1. Feature Audit & Architecture Alignment
*   **Existing Capabilities:** Does a similar feature already exist in the codebase (e.g., within `@workspace/ui`, existing endpoints, or database schema)?
*   **Net-New Effort:** What specifically needs to be built from scratch? 
*   **Monorepo Fit:** Does it adhere to the turbo monorepo structure (admin-web, user-web, backend, common packages)?
*   **RBAC Check:** How does this interact with the Role-Based Access Control (RBAC)? Which specific roles get access?

## 2. Value Proposition (Real vs. Perceived Value)
*   **User Pain Point:** What specific problem does this solve? Is it a "vitamin" (nice to have) or a "painkiller" (must have)?
*   **Usage Frequency:** Is this something users will engage with daily, weekly, or rarely?
*   **Measurable Impact:** How will we measure the success of this feature (e.g., increased engagement, reduced support tickets, higher retention)?

## 3. Competitive Landscape ("Don't Build It" Check)
*   **Market Alternatives:** Is there an existing 3rd-party SaaS or API that does this better?
*   **Core Competency:** Is this core to the 180 Workspace business model? (If not, integrate instead of build).
*   **Competitor Parity:** Are we building this just because competitors have it, or does it actually add unique value to our specific users?

## 4. Multi-Persona Evaluation

### A. The CEO Perspective (Business & Strategy)
*   **Revenue Impact:** Does this drive new revenue, aid retention, or reduce operational costs?
*   **Market Positioning:** Does this make the platform significantly more attractive to our key stakeholders or end Users?
*   **Resource Allocation:** Is the ROI worth the engineering cost and maintenance burden?

### B. The Product Manager Perspective (UX & Adoption)
*   **User Flow:** Does this complicate or simplify the user journey?
*   **MVP Definition:** What is the absolute minimum version of this feature we can ship to validate the idea without over-engineering?
*   **Aesthetics:** Does the UI feel premium, dynamic, and responsive?

### C. The Senior Software Engineer Perspective (Tech & Scale)
*   **LLD & Patterns:** Does this follow our Low-Level Design principles, developer best practices, and layered frontend architecture?
*   **Performance:** Will this impact page load times or backend latency?
*   **Scalability:** Can this handle high concurrent traffic without breaking?
*   **State Management:** How does this impact our state management and data fetching?

## Audit Output Format
For every prompt submitted, the AI response MUST follow this exact structure:
1. **The Core Concept:** 1-2 sentence breakdown of the idea.
2. **System Audit:** What we already have vs. What we need to build.
3. **Value & Competitor Check:** Is this real value? Should we integrate instead of build?
4. **Persona Reviews:**
    *   **CEO Verdict:** (Approve / Reject / Pivot) + Justification.
    *   **PM Verdict:** (MVP Scope / Reject) + Justification.
    *   **Eng Verdict:** (Tech Feasibility / Architecture Warnings) + Justification.
5. **Final Recommendation:** A clear GO, NO-GO, or PIVOT recommendation.
