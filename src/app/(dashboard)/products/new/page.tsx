import { PageHeader } from '@/components/shared/page-header';
import { ProductForm } from '../product-form';

export default function NewProductPage() {
  return (<div><PageHeader title="Νέο προϊόν" /><ProductForm id={null} /></div>);
}
