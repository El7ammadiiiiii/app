import { ICODetails } from '@/components/ico/ico-details';

export default async function ICODetailsPage ( { params }: { params: Promise<{ id: string }> } )
{
  const { id } = await params;
  return <ICODetails id={ id } />;
}
