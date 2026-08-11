import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from 'test/test-utils';

import { mockQueryLibraryContext } from '../utils/mocks';

import { type QueryLibraryFiltersFormType } from './QueryLibrary';
import { QueryLibraryFilters, type QueryLibraryFiltersProps } from './QueryLibraryFilters';

const SEARCH_PLACEHOLDER = 'Search by data source, query content, title, or description';
const DATASOURCE_PLACEHOLDER = 'Filter by data source';
const USER_PLACEHOLDER = 'Filter by user name';
const TAG_PLACEHOLDER = 'Filter by tag';
const SORT_PLACEHOLDER = 'Sort';

const defaultContext = mockQueryLibraryContext;

let context = defaultContext;

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => context,
}));

// Store form methods globally for test access
let testFormMethods: any = null;

const QueryLibraryFiltersWrapper = (props: QueryLibraryFiltersProps) => {
  const methods = useForm<QueryLibraryFiltersFormType>({
    defaultValues: {
      searchQuery: '',
      datasourceFilters: [],
      userFilters: [],
      sortingOption: undefined,
      tagFilters: [],
    },
  });

  // Store form methods for test access
  testFormMethods = methods;

  return (
    <FormProvider {...methods}>
      <QueryLibraryFilters {...props} />
    </FormProvider>
  );
};

describe('QueryLibraryFilters', () => {
  const defaultProps: QueryLibraryFiltersProps = {
    datasourceFilterOptions: [{ label: 'Datasource 1', value: 'ds1' }],
    disabled: false,
    userFilterOptions: [{ label: 'User 1', value: 'user1' }],

    getTagOptions: async () => [{ term: 'tag1', count: 1 }],
  };

  it('calls onChangeSearchQuery when search input changes', async () => {
    render(<QueryLibraryFiltersWrapper {...defaultProps} />);
    const searchInput = await waitFor(() => screen.getByPlaceholderText(SEARCH_PLACEHOLDER));
    expect(searchInput).toBeInTheDocument();
    await userEvent.type(searchInput, 'f');
    expect(searchInput).toHaveValue('f');
    // Inspect form state using the stored form methods
    expect(testFormMethods?.getValues().searchQuery).toBe('f');
  });

  it('calls onChangeDatasourceFilters when datasource filter changes', async () => {
    render(<QueryLibraryFiltersWrapper {...defaultProps} />);
    const datasourceSelect = screen.getByText(DATASOURCE_PLACEHOLDER);
    await userEvent.click(datasourceSelect);
    await userEvent.click(screen.getByText('Datasource 1'));
    expect(testFormMethods?.getValues().datasourceFilters).toEqual([{ label: 'Datasource 1', value: 'ds1' }]);
  });

  it('calls onChangeUserFilters when user filter changes', async () => {
    render(<QueryLibraryFiltersWrapper {...defaultProps} />);
    const userSelect = screen.getByText(USER_PLACEHOLDER);
    await userEvent.click(userSelect);
    await userEvent.click(screen.getByText('User 1'));
  });

  it('calls onChangeSortingOption when sorting option changes', async () => {
    const { user } = render(<QueryLibraryFiltersWrapper {...defaultProps} />);

    const sortingSelect = await waitFor(() => screen.getByText(SORT_PLACEHOLDER));
    expect(sortingSelect).toBeVisible();
    await user.click(sortingSelect);
    const descOption = await screen.findByRole('option', { name: 'Alphabetically (Z–A)' });
    await user.click(descOption);
    expect(testFormMethods?.getValues().sortingOption).toEqual({
      label: 'Alphabetically (Z–A)',
      value: 'desc',
      sort: expect.any(Function),
    });
  });

  it('calls onChangeTagFilters when tag filter changes', async () => {
    render(<QueryLibraryFiltersWrapper {...defaultProps} />);
    const tagFilter = screen.getByText(TAG_PLACEHOLDER);

    // Click on the TagFilter to open the dropdown
    await userEvent.click(tagFilter!);

    // Wait for the dropdown to load and click on the tag option
    const tagOption = await screen.findByText('tag1');
    await userEvent.click(tagOption);

    // TagFilter calls onChange with an array of strings
    expect(testFormMethods?.getValues().tagFilters).toEqual(['tag1']);
  });

  it('disables inputs when disabled prop is true', async () => {
    render(<QueryLibraryFiltersWrapper {...defaultProps} disabled={true} />);
    await waitFor(() => expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeDisabled());

    const datasourceSelect = screen.getByLabelText(DATASOURCE_PLACEHOLDER);
    const userSelect = screen.getByLabelText(USER_PLACEHOLDER);

    expect(datasourceSelect).toBeDisabled();
    expect(userSelect).toBeDisabled();

    // Note: TagFilter doesn't support disabled prop, so it remains enabled
    // This is expected behavior until TagFilter component is updated to support disabled state
  });
});
