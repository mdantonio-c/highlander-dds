// DO NOT REMOVE ME!
// Put here custom User properties, if any... or keep it empty
export interface CustomUser {}

export interface KeyValue {
  /** @nullable */
  [key: string]: any;
}

export interface Dataset {
  name: string;
  info: DatasetInfo;
  products: KeyValue;
}

export interface DatasetInfo {
  label: string;
  description: string;
  attribution: string;
  contact: ContactInfo;
  doi: string;
  image: string;
  license: LicenseInfo;
  publication_date: string;
  /** @nullable */
  update_frequency?: string;
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

export interface RequestArgs {
  /** @nullable */
  variable?: string[];
  product_type: string;
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
