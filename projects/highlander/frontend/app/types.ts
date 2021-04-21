// DO NOT REMOVE ME!
// Put here custom User properties, if any... or keep it empty
export interface CustomUser {}
/**
export interface MyType {
  myfield: string;
  readonly ro: number;
  optional?: Date;
}
**/

export interface Dataset {
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
