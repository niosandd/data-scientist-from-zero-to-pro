import { render, screen } from 'test/test-utils';

import { getCreateKeeperUrl, getKeeperProviders } from '../constants';
import { type KeeperFormValues } from '../types';

import { KeeperTypeChooser } from './KeeperTypeChooser';

describe('KeeperTypeChooser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all provider cards', () => {
    render(<KeeperTypeChooser />);

    for (const provider of getKeeperProviders()) {
      expect(screen.getByText(provider.name)).toBeInTheDocument();
    }
  });

  it('renders provider descriptions', () => {
    render(<KeeperTypeChooser />);

    for (const provider of getKeeperProviders()) {
      expect(screen.getByText(provider.description)).toBeInTheDocument();
    }
  });

  it('renders each provider as a link to its create page', () => {
    render(<KeeperTypeChooser />);

    for (const provider of getKeeperProviders()) {
      const card = screen.getByRole('link', { name: new RegExp(provider.name, 'i') });
      expect(card).toHaveAttribute('href', getCreateKeeperUrl(provider.id as KeeperFormValues['type']));
    }
  });

  it('renders provider tags as badges', () => {
    render(<KeeperTypeChooser />);

    const allTags = getKeeperProviders().flatMap((p) => p.tags);
    const uniqueTags = new Set(allTags);
    for (const tag of uniqueTags) {
      expect(screen.getAllByText(tag).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders provider logos as decorative images', () => {
    render(<KeeperTypeChooser />);

    const logos = screen.getAllByRole('presentation');
    expect(logos).toHaveLength(getKeeperProviders().length);
    for (const logo of logos) {
      expect(logo.tagName).toBe('IMG');
    }
  });

  it('renders the card grid as a list for accessibility', () => {
    render(<KeeperTypeChooser />);

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(getKeeperProviders().length);
  });
});
