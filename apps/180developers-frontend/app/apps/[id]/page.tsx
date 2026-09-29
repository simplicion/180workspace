import AppDetailClient from './AppDetailClient';

export function generateStaticParams() {
  return [{ id: 'app' }];
}

export default function Page() {
  return <AppDetailClient />;
}
