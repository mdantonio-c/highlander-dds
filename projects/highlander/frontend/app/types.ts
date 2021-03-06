// DO NOT REMOVE ME!
// Put here custom User properties, if any... or keep it empty
export interface CustomUser {
  disk_quota: number;
}

export interface KeyValue {
  /** @nullable */
  [key: string]: any;
}

export interface Dataset {
  name: string;
  info: DatasetInfo;
  products: KeyValue;
}

export interface ProductReference {
  id: string;
  description: string;
  /** @nullable */
  variables?: any[];
}

export interface DatasetInfo {
  id: string;
  default: string;
  description: string;
  attribution: string;
  contact: ContactInfo;
  label: string;
  doi: string;
  image: string;
  license: LicenseInfo;
  publication_date: string;
  /** @nullable */
  update_frequency?: string;
  related_data: any[];
  products: ProductReference[];
}

export interface DatasetVariables {
  [key: string]: any;
}

export interface ContactInfo {
  email: string;
  name: string;
  /** @nullable */
  webpage?: string;
}

export interface LicenseInfo {
  name: string;
  url: string;
}

export interface Widget {
  name: string;
  label: string;
  /** @nullable */
  icon?: string;
  required: boolean;
  parameter: string;
  type: string;
  details: any;
  /** @nullable */
  help: string;
  /** @nullable */
  info: string;
}

export interface ProductInfo {
  id: string;
  label: string;
  dataset: DatasetInfo;
  widgets: Widget[];
  widgets_order: string[];
  /** @nullable */
  constraints?: string;
}

export interface TimeArg {
  year?: string[];
  month?: string[];
  day?: string[];
  hour?: string[];
}

export interface RequestArgs {
  /** @nullable */
  variable?: string[];
  product_type: string;
  time?: TimeArg;
  format?: string;
}

export interface RequestOutput {
  filename: string;
  timestamp: string;
  size: number;
}

export interface Request {
  id: number;
  name: string;
  dataset_name: string;
  args: RequestArgs;
  submission_date: string;
  /** @nullable */
  end_date?: string;
  status: string;
  task_id: string;
  /** @nullable */
  output_file?: RequestOutput;
}

export interface Requests extends Array<Request> {}

export interface StorageUsage {
  quota: number;
  used: number;
}
