import LinkDetailClient from './LinkDetailClient';

export function generateStaticParams() {
  return [{ linkId: 'link' }];
}

export default function Page() {
  return <LinkDetailClient />;
}
