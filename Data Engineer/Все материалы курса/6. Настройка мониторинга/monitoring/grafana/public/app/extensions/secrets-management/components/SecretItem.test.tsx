import { render, screen, userEvent } from 'test/test-utils';

import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/extensions/types';

import { secureValueList } from '../__mocks__/secureValueList';
import { DECRYPT_ALLOW_LIST_LABEL_MAP } from '../constants';

import { SecretItem } from './SecretItem';

const handleOnEditSecureValue = jest.fn();
const handleOnDeleteSecureValue = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
});

beforeEach(() => {
  // Mock permissions to allow editing and deleting secrets
  contextSrv.user.permissions = {
    [AccessControlAction.SecretSecureValuesWrite]: true,
    [AccessControlAction.SecretSecureValuesDelete]: true,
  };
});

function getProps(index = 0) {
  return {
    secureValue: secureValueList[index],
    onEditSecureValue: handleOnEditSecureValue,
    onDeleteSecureValue: handleOnDeleteSecureValue,
  };
}

describe('SecretItem', () => {
  it('should show secret name', () => {
    const props = getProps();
    render(<SecretItem {...props} />);
    expect(screen.getByText(props.secureValue.metadata.name!)).toBeInTheDocument();
  });

  it('should show secret description', () => {
    const props = getProps();
    render(<SecretItem {...props} />);
    expect(screen.getByText('Description:')).toBeInTheDocument();
    expect(screen.getByText(props.secureValue.spec.description)).toBeInTheDocument();
  });

  it('should show secret created at', () => {
    const props = getProps();
    render(<SecretItem {...props} />);
    expect(screen.getByText('Created:')).toBeInTheDocument();
    expect(screen.getByText(props.secureValue.metadata.creationTimestamp!)).toBeInTheDocument(); // raw value when running test
  });

  it('should show all secret decrypters', () => {
    const props = getProps(1);
    render(<SecretItem {...props} />);
    expect(screen.getByText('Decrypters:')).toBeInTheDocument();
    // Only two decrypters in the list at the moment
    expect(props.secureValue.spec.decrypters!.length).toBe(2);
    props.secureValue.spec.decrypters!.forEach((decrypter) => {
      expect(
        screen.getByText(DECRYPT_ALLOW_LIST_LABEL_MAP[decrypter as keyof typeof DECRYPT_ALLOW_LIST_LABEL_MAP])
      ).toBeInTheDocument();
    });
  });
  it('should not show keeper if it doesnt exist', () => {
    const props = getProps();
    props.secureValue.status.keeper = '';
    render(<SecretItem {...props} />);
    expect(screen.queryByText('Keeper:')).not.toBeInTheDocument();
  });

  it('should show keeper if it exists', () => {
    const props = getProps(1);
    render(<SecretItem {...props} />);
    expect(screen.queryByText('Keeper:')).toBeInTheDocument();
    expect(screen.queryByText(props.secureValue.status.keeper as string)).toBeInTheDocument();
  });

  it('should have an edit button', async () => {
    const props = getProps();
    render(<SecretItem {...props} />);

    const editButton = screen.getByText('Edit');
    expect(editButton).toBeInTheDocument();
    await userEvent.click(editButton);
    expect(handleOnEditSecureValue).toHaveBeenCalledTimes(1);

    // a11y
    const editButtonByAriaLabel = screen.getByLabelText(`Edit ${props.secureValue.metadata.name!}`);
    expect(editButtonByAriaLabel).toBeInTheDocument();
    await userEvent.click(editButtonByAriaLabel);
    expect(handleOnEditSecureValue).toHaveBeenCalledTimes(2);
  });

  it('should have a delete button with confirmation', async () => {
    const props = getProps();
    render(<SecretItem {...props} />);

    const deleteButton = screen.getByLabelText(`Delete ${props.secureValue.metadata.name!}`, { selector: 'button' });
    expect(deleteButton).toBeInTheDocument();

    await userEvent.click(deleteButton);
    expect(await screen.findByText(/Are you sure you want to delete/i));
    await userEvent.type(screen.getByPlaceholderText('Type "delete" to confirm'), 'delete');

    await userEvent.click(screen.getByText('Delete'));
    expect(handleOnDeleteSecureValue).toHaveBeenCalledTimes(1);
  });

  describe('When users have different permissions', () => {
    it('should not show edit button if user does not have permission', () => {
      // Override permissions to remove edit permission
      contextSrv.user.permissions = {
        [AccessControlAction.SecretSecureValuesWrite]: false,
        [AccessControlAction.SecretSecureValuesDelete]: true,
      };
      const props = getProps();
      render(<SecretItem {...props} />);
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('should not show delete button if user does not have permission', () => {
      // Override permissions to remove delete permission
      contextSrv.user.permissions = {
        [AccessControlAction.SecretSecureValuesWrite]: true,
        [AccessControlAction.SecretSecureValuesDelete]: false,
      };
      const props = getProps();
      render(<SecretItem {...props} />);
      expect(
        screen.queryByLabelText(`Delete ${props.secureValue.metadata.name!}`, { selector: 'button' })
      ).not.toBeInTheDocument();
    });

    it('should not show edit or delete buttons if user has no permissions', () => {
      // Override permissions to remove all permissions
      contextSrv.user.permissions = {
        [AccessControlAction.SecretSecureValuesWrite]: false,
        [AccessControlAction.SecretSecureValuesDelete]: false,
      };
      const props = getProps();
      render(<SecretItem {...props} />);
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(`Delete ${props.secureValue.metadata.name!}`, { selector: 'button' })
      ).not.toBeInTheDocument();
    });

    it('should show both edit and delete buttons when user has all permissions', () => {
      // Ensure all permissions are granted
      contextSrv.user.permissions = {
        [AccessControlAction.SecretSecureValuesWrite]: true,
        [AccessControlAction.SecretSecureValuesDelete]: true,
      };
      const props = getProps();
      render(<SecretItem {...props} />);
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(
        screen.getByLabelText(`Delete ${props.secureValue.metadata.name!}`, { selector: 'button' })
      ).toBeInTheDocument();
    });
  });
});
