import { PageHeader } from '@/components/shared/page-header';
import { CampaignForm } from '../campaign-form';
import { loadLinkOptions } from '../link-options';

export default async function NewCampaignPage() {
  const opts = await loadLinkOptions();
  return (<div><PageHeader title="Νέα καμπάνια" description="Push ειδοποίηση προς τους γονείς της εφαρμογής." /><CampaignForm id={null} {...opts} /></div>);
}
