import { PageHeader } from '@/components/shared/page-header';
import { CharacterForm } from '../character-form';

export default function NewCharacterPage() {
  return (<div><PageHeader title="Νέος χαρακτήρας" /><CharacterForm id={null} /></div>);
}
