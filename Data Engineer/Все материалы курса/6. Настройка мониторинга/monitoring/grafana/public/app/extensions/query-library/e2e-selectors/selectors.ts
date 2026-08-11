import { type E2ESelectors } from '@grafana/e2e-selectors';

export const QueryLibraryComponents = {
  saveQueryButton: {
    button: 'data-testid save to query library button',
  },
  replaceQueryButton: {
    button: 'data-testid replace query from library button',
  },
  savedQueriesMenuButton: {
    button: 'data-testid saved queries button',
  },
  saveQueryModal: {
    modal: 'data-testid save to query library modal',
    cancel: 'data-testid save to query library modal cancel',
    confirm: 'data-testid save to query library modal confirm',
    title: 'data-testid save to query library modal title',
    description: 'data-testid save to query library modal description',
    tagsInput: 'data-testid save to query library modal tags input',
  },
  queryLibraryDrawer: {
    content: 'data-testid query library content',
    delete: 'data-testid query library delete',
    lock: 'data-testid query library lock',
    duplicate: 'data-testid query library duplicate',
    confirm: 'data-testid query library confirm',
    item: (title: string) => `data-testid query library item ${title}`,
    newBadge: 'data-testid query library new query badge',
    titleInput: 'data-testid query library title input',
    descriptionInput: 'data-testid query library description input',
    shareQueryWithAllUsersInput: 'data-testid query library share query with all users input',
    saveQueryButton: 'data-testid query library save query button',
    editButton: 'data-testid query library edit button',
    searchInput: 'data-testid query library search input',
    tagsInput: 'data-testid query library tags input',
    datasourceInput: 'data-testid query library datasource input',
    usernameInput: 'data-testid query library username input',
    favoriteButton: 'data-testid query library favorite button',
    editInExploreButton: 'data-testid query library edit in explore button',
  },
};

export const QueryLibraryPages = {};

export const selectors: {
  pages: E2ESelectors<typeof QueryLibraryPages>;
  components: E2ESelectors<typeof QueryLibraryComponents>;
} = {
  pages: QueryLibraryPages,
  components: QueryLibraryComponents,
};
