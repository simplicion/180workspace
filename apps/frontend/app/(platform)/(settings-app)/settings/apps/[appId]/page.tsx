import { redirect } from 'next/navigation';

export default async function AppDetailRedirect({ params }: { params: Promise<{ appId: string }> }) {
    const { appId } = await params;
    redirect('/settings/apps/${appId}/config');
}
