> *Last verified against Postgres schema migration (July 2026)*

# 180workspace (Inventory Management System) / Enterprise Platform

## Project Overview
The 180workspace Enterprise Platform is a multi-tenant business management and inventory tracking architecture designed to handle complex organizational hierarchies, human resources, CRM, scheduling, and physical inventory routing. The project operates globally via a dual-layered architecture featuring robust RESTful communication and real-time socket updates.

## Purpose of 180workspace
The primary goal of the 180workspace system is to centralize operational datasets across multiple disparate departments—ranging from HR (Salaries, Leaves) to Finance (Invoicing, Expenses) and CRM (Clients, Vendors). It incorporates strict Role-Based Access Control (RBAC) and data containment mechanisms (Tenant level isolation).

## Key Features
- **Multi-Tenant Data Architecture:** Dynamic tenant resolution isolating PostgreSQL namespaces per company.
- **Role-Based Access Control (RBAC):** Hierarchical permissions governing visibility over CRM, HR, Finance, and System configurations.
- **Enterprise Activity Hub:** Advanced system audit tracking mapping who mutated what document and when.
- **Next-Generation UX:** App Router-based frontend scaling high-density data tables and customizable dashboards.
- **Real-time Synchronization:** Socket.IO integrated natively for chat, collaborative meeting updates, and alert notifications.
- **Background Cron Services:** Automated payroll calculation and subscription expiration management.

## Tech Stack Summary
- **Frontend Layer:** Next.js (15.x, App Router), React 19, Tailwind CSS, Framer Motion, Zustand/Context for State.
- **Backend Layer:** Node.js, Express.js.
- **Database Layer:** PostgreSQL with Prisma ORM, utilizing multitenancy.
- **Tooling & Queueing:** BullMQ for asynchronous jobs, Node-Cron for scheduled processing.
- **Security:** Helmet, JWT (Access & Refresh tokens), Mongo-Sanitize, express-rate-limit.

## High-Level Architecture Summary
The system relies on a **microservice-oriented monolith (Modular Monolith)**. The Next.js frontend acts strictly as the presentation and server-side rendering client, dispatching requests to the independent Node.js REST API. The API intercepts requests via a custom Tenant-DB middleware, resolving the targeted PostgreSQL cluster namespace based on the client's token or host origin. Background events offload to Redis/BullMQ.
