import { type SecureValue } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { hasOwnerReference, transformSecretName } from '../utils';

import { SecretItem } from './SecretItem';
import { SecretsEmptyState } from './SecretsEmptyState';
import { SecretsSearchEmptyState } from './SecretsSearchEmptyState';

interface SecretsListProps {
  secureValueList?: SecureValue[];
  onEditSecureValue: (name: string) => void;
  onDeleteSecureValue: ({ name }: { name: string }) => void;
  onCreateSecureValue: () => void;
  filter?: string;
}

export function SecretsList({
  secureValueList = [],
  onEditSecureValue,
  onDeleteSecureValue,
  onCreateSecureValue,
  filter,
}: SecretsListProps) {
  const visibleSecureValues = secureValueList.filter((secureValue) => !hasOwnerReference(secureValue));
  const hasSecureValues = visibleSecureValues.length > 0;

  const filteredSecureValues = !filter
    ? visibleSecureValues
    : visibleSecureValues.filter((secureValue) =>
        secureValue?.metadata?.name?.includes(transformSecretName(filter) || '')
      );

  const hasFilteredSecureValues = filteredSecureValues.length > 0;

  if (!hasSecureValues) {
    return <SecretsEmptyState onCreateSecret={onCreateSecureValue} />;
  }

  if (hasSecureValues && !hasFilteredSecureValues) {
    return <SecretsSearchEmptyState />;
  }

  return (
    <>
      <ul>
        {filteredSecureValues.map((secureValue) => (
          <SecretItem
            key={secureValue.metadata.name}
            secureValue={secureValue}
            onEditSecureValue={onEditSecureValue}
            onDeleteSecureValue={onDeleteSecureValue}
          />
        ))}
      </ul>
    </>
  );
}
