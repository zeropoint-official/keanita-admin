import { PageHeader } from '@/components/shared/page-header';
import { EventForm } from '../event-form';

export default function NewEventPage() {
  return (<div><PageHeader title="Νέα εκδήλωση" /><EventForm id={null} /></div>);
}
