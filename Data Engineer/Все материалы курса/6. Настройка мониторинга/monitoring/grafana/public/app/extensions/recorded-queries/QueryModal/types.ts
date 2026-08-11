import { type DataQuery, type DataSourceInstanceSettings } from '@grafana/data';

export interface QueryModalModel {
  title: string;
  body: QueryModalBody;
}

export interface QueryModalBodyProps {
  query?: DataQuery;
  queries?: DataQuery[];
  onAddQuery?: (q: DataQuery) => void;
  onChangeDataSource?: (ds: DataSourceInstanceSettings) => void;
}

type QueryModalBody = React.ComponentType<QueryModalBodyProps>;
