import AppShell from '@/components/AppShell';
import { abaFromSearchParam } from '@/lib/aba';

export default async function Page({ searchParams }) {
  const sp = await Promise.resolve(searchParams);
  const aba = abaFromSearchParam(sp?.aba);
  return <AppShell initialAba={aba} />;
}
