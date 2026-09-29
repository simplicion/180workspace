import StandaloneCheckoutPage from './CheckoutClient';

export function generateStaticParams() {
  return [{ sessionId: 'demo' }];
}

export default function Page() {
  return <StandaloneCheckoutPage />;
}
