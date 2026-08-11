import { render, screen } from 'test/test-utils';

import { ChooseKeeperTypePage } from './ChooseKeeperTypePage';

jest.mock('./components/KeeperTypeChooser', () => ({
  KeeperTypeChooser: () => <div data-testid="choose-keeper-type" />,
}));

describe('ChooseKeeperTypePage', () => {
  it('renders the type chooser', () => {
    render(<ChooseKeeperTypePage />);
    expect(screen.getByTestId('choose-keeper-type')).toBeInTheDocument();
  });

  it('renders "New keeper" title', () => {
    render(<ChooseKeeperTypePage />);
    expect(screen.getByText('New keeper')).toBeInTheDocument();
  });
});
