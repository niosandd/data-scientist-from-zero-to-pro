import { render, screen, userEvent } from 'test/test-utils';

import { contextSrv } from 'app/core/services/context_srv';
import { type SecureValue } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';
import { AccessControlAction } from 'app/extensions/types';

import { secureValueList } from '../__mocks__/secureValueList';
import { hasOwnerReference } from '../utils';

import { SecretsList } from './SecretsList';

// Per item tests har handled by SecretItem test suite
jest.mock('./SecretItem', () => ({
  SecretItem: ({ secureValue }: { secureValue: SecureValue }) => {
    return <div>{secureValue.metadata.name!}</div>;
  },
}));

const handleEditSecret = jest.fn();
const handleDeleteSecret = jest.fn();
const handleCreateSecret = jest.fn();

function getProps(secureValueList: SecureValue[] = [], filter?: string) {
  return {
    secureValueList,
    filter,
    onEditSecureValue: handleEditSecret,
    onDeleteSecureValue: handleDeleteSecret,
    onCreateSecureValue: handleCreateSecret,
  };
}

afterEach(() => {
  jest.clearAllMocks();
});

beforeEach(() => {
  // Mock permissions to allow creating secrets
  contextSrv.user.permissions = {
    [AccessControlAction.SecretSecureValuesCreate]: true,
  };
});

describe('SecretsList', () => {
  it('should show empty state with create button when user has create permission', async () => {
    const props = getProps();
    render(<SecretsList {...props} />);
    expect(screen.getByText(/you don't have any secrets yet/i)).toBeInTheDocument();
    const createButton = screen.getByText(/create secure value/i, {
      selector: 'button > span',
    });
    expect(createButton).toBeInTheDocument();
    await userEvent.click(createButton);
    expect(handleCreateSecret).toHaveBeenCalledTimes(1);
  });

  it('should show empty state without create button when user lacks create permission', () => {
    // Override permissions to remove create permission
    contextSrv.user.permissions = {
      [AccessControlAction.SecretSecureValuesCreate]: false,
    };
    const props = getProps();
    render(<SecretsList {...props} />);
    expect(screen.getByText(/you don't have any secrets yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create secure value/i })).not.toBeInTheDocument();
    expect(screen.getByText(/you do not have permission to create secure values/i)).toBeInTheDocument();
  });

  it('should render only secrets without owner references', () => {
    const owned = secureValueList.filter(hasOwnerReference);
    const visible = secureValueList.filter((sv) => !hasOwnerReference(sv));
    const props = getProps(secureValueList);
    render(<SecretsList {...props} />);

    visible.forEach((sv) => expect(screen.getByText(sv.metadata.name!)).toBeInTheDocument());
    owned.forEach((sv) => expect(screen.queryByText(sv.metadata.name!)).not.toBeInTheDocument());
  });

  it('should show the empty state when every secret has an owner reference', () => {
    const ownedOnly = secureValueList.filter(hasOwnerReference);
    const props = getProps(ownedOnly);
    render(<SecretsList {...props} />);
    expect(screen.getByText(/you don't have any secrets yet/i)).toBeInTheDocument();
  });

  it('should show search empty state when filter is in use without matching result', () => {
    const props = getProps(secureValueList, '!?IDONTEXIST!?');
    render(<SecretsList {...props} />);
    expect(screen.getByText(/no secrets found/i)).toBeInTheDocument();
  });

  it('should only show search results matching filter', () => {
    const filter = secureValueList[0].metadata.name!;
    const matching = secureValueList.filter((sv) => !hasOwnerReference(sv) && sv.metadata.name!.includes(filter));
    const hidden = secureValueList.filter((sv) => hasOwnerReference(sv) || !sv.metadata.name!.includes(filter));
    const props = getProps(secureValueList, filter);
    render(<SecretsList {...props} />);

    matching.forEach((sv) => expect(screen.getByText(sv.metadata.name!)).toBeInTheDocument());
    hidden.forEach((sv) => expect(screen.queryByText(sv.metadata.name!)).not.toBeInTheDocument());
  });
});
