---
sidebar_position: 1
---

# Third-Party Integrations

The 180workspace Platform integrates with multiple external providers to handle payments, AI generation, file storage, and communications. These are primarily managed within the `src/services/` directory of the `http-backend`.

## 1. Payments & Billing (Stripe & Razorpay)
Managed via `billing.service.js`.
- **Stripe:** Used for international payments and SaaS subscriptions. We utilize Stripe Webhooks (configured in `webhook.routes.js`) to listen for `invoice.payment_succeeded` and `customer.subscription.deleted` events.
- **Razorpay:** Used for domestic (INR) transactions. 

## 2. Artificial Intelligence (Groq, OpenAI, Gemini)
Managed via `ai-content.service.js` and `ai-automation.service.js`.
- The platform uses a multi-LLM strategy to ensure high availability and cost optimization.
- **Groq:** Used for high-speed, low-latency tasks (like rapid text summarization).
- **OpenAI:** Used for complex reasoning and advanced text generation.
- **Gemini:** Used as a fallback or for specific multimodal tasks.
- Usage is logged in the `AiRequestLog` PostgreSQL collection to monitor API costs per company.

## 3. Communications (Email & Push)
- **Nodemailer (`email.service.js`):** Handles all transactional emails (password resets, onboarding invites, invoice receipts).
- **Firebase Admin:** Used for sending Push Notifications to mobile devices or PWA clients via `smart-notification.service.js`.

## 4. File Storage (Cloudinary)
- Uploads (profile pictures, documents, pitch decks) are intercepted by Multer middleware.
- The files are then uploaded to **Cloudinary** via the Node SDK.
- The resulting Cloudinary secure URL is stored in the `Asset.js` PostgreSQL collection.

## 5. Background Jobs (BullMQ & Redis)
Managed via `queue.service.js`.
- **BullMQ:** We use BullMQ (backed by Redis) to offload heavy tasks from the main Node.js event loop.
- Examples of queued jobs: Bulk email sending, generating heavy PDF reports, and processing large CSV imports.

## 6. Scheduled Tasks (Node-Cron)
Managed via `cron.service.js` and `subscriptionCron.service.js`.
- **Cron Jobs:** Used for recurring tasks like checking for expired subscriptions, sending daily digest emails, and cleaning up temporary files.
