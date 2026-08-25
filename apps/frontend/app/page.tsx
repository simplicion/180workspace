import { redirect } from 'next/navigation';

export default function WorkspaceRoot() {
  // Since 180workspace.com is now handled by the Astro marketing site,
  // app.180workspace.com (this Next.js app) should redirect directly to the login.
  redirect('/login');
}
