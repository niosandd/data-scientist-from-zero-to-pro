import { type DataQuery } from '@grafana/schema';

export type QueryLibraryEventsPropertyMap = Record<string, string | boolean | undefined>;

export type AddQueryTemplateCommand = {
  title: string;
  description?: string;
  tags: string[];
  isVisible?: boolean;
  targets: DataQuery[];
  isLocked?: boolean;
};

export enum QueryLibraryTab {
  ALL = 'all',
  FAVORITES = 'favorites',
  RECENT = 'history',
  FEEDBACK = 'feedback',
}
