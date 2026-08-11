import { isEqual } from 'lodash';

import { type SettingsSection } from 'app/types/settings';

import { type SAMLFormData, type SAMLSettings, type SAMLStepKey } from '../../../types';
import { BASE_URL } from '../constants';

const defaultSettings: SettingsSection = {
  enabled: 'false',
  skip_org_role_sync: 'false',
};

export function isDefaultSAMLConfig(settings: SettingsSection) {
  return isEqual(settings, defaultSettings);
}

export function isConfiguredKeyCert(prop: string, formData: Partial<SAMLFormData>, storedSettings: SettingsSection) {
  switch (prop) {
    case 'privateKey':
      return formData[prop] === storedSettings['private_key'] && !!storedSettings['private_key'];
    case 'privateKeyPath':
      return formData[prop] === storedSettings['private_key_path'] && !!storedSettings['private_key_path'];
    case 'certificate':
      return formData[prop] === storedSettings['certificate'] && !!storedSettings['certificate'];
    case 'certificatePath':
      return formData[prop] === storedSettings['certificate_path'] && !!storedSettings['certificate_path'];
    default:
      return false;
  }
}

export function getMetadataValueType(settings: SAMLSettings): 'path' | 'base64' | 'url' {
  if (settings.idpMetadataPath) {
    return 'path';
  } else if (settings.idpMetadata) {
    return 'base64';
  } else {
    return 'url';
  }
}

export const getSectionUrl = (section: SAMLStepKey) => {
  return `${BASE_URL}/${section || ''}`;
};
