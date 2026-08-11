import { type DateTime } from '@grafana/data';

type AnnouncementBannerVisibility = 'authenticated' | 'everyone';
export type AnnouncementBannerFormData = {
  enabled: boolean;
  startTime?: DateTime;
  endTime?: DateTime;
  message: string;
  variant: 'error' | 'info' | 'warning';
  visibility: AnnouncementBannerVisibility;
};
