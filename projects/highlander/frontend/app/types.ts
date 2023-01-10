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
  related_data?: any[];
  products?: ProductReference[];
  application?: boolean;
  category?: string;
  url?: string;
  use_case?: string;
  exclude?: boolean;
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
  product_type: string;
  /** @nullable */
  variable?: string[];
  time?: TimeArg;
  area?: SpatialArea;
  location?: SpatialPoint;
  format: string;
  [other: string]: any;
}

export interface RequestOutput {
  filename: string;
  /** @nullable */
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
  error_message?: string;
  task_id: string;
  /** @nullable */
  output_file?: RequestOutput;
}

export interface Requests extends Array<Request> {}

export interface StorageUsage {
  quota: number;
  used: number;
}

export interface SpatialArea {
  north: number;
  east: number;
  south: number;
  west: number;
}

export interface SpatialPoint {
  latitude: number;
  longitude: number;
}

export interface LatLngRange {
  start: number;
  stop?: number;
}

export interface SoilErosionFilter {
  indicator: string;
  administrative: string;
  period: string;
}

export interface Era5Filter {
  indicator: string;
  time_period: string;
  administrative: string;
}

export interface ForestSuitabilityFilter {
  indicator: string;
  administrative: string;
  period: string;
  bioclimaticTemperature?: string;
  bioclimaticPrecipitation?: string;
  forestSpecie?: string;
}

export interface SuitabilityVegetationFilter {
  indicator: string;
}

export interface SuitabilityVegetationFeatureInfo {
  type: string;
  id: string;
  geometry?: string;
  properties: SuitabilityVegetationFeatureInfoProperty;
}

export interface SuitabilityVegetationFeatureInfoProperty {
  CompI_index?: number;
  Index_of_Aflatoxin?: number;
}

export interface SuitabilityVegetationChartData {
  name: string;
  value: number;
}

export interface SoilErosionMapCrop {
  product?: string;
  period?: string;
  model?: string;
  area_type?: string;
  area_id?: string;
  indicator?: string;
}

export interface HumanWellbeingMapCrop {
  product?: string;
  area_type?: string;
  area_id?: string;
  indicator?: string;
  daily_metric?: string;
  year?: string;
  date?: string;
}

export interface Era5MapCrop {
  product?: string;
  area_type?: string;
  area_id?: string;
  indicator?: string;
  time_period?: string;
}

export interface ForestSuitabilityMapCrop {
  product?: string;
  period?: string;
  area_type?: string;
  area_id?: string;
  indicator?: string;
}

export interface HumanWellbeingFilter {
  indicator: string;
  administrative: string;
  daily_metric: string;
  timePeriod: string;
  day?: Date;
}

export interface CropWaterFilter {
  area: string;
  layer: string;
  percentile: number;
  period?: DateStruct;
}

export interface CodeLabel {
  code: string;
  label: string;
  /** @nullable */
  [key: string]: any;
}

export interface IndicatorsCodeLabel {
  code: string;
  label: string;
  product: string;
  /** @nullable */
  [key: string]: any;
}

export interface ProvinceFeature {
  prov_acr: string;
  prov_istat_code: string;
  prov_istat_code_num: number;
  name: string;
  reg_istat_code: string;
  reg_istat_code_num: number;
  reg_name: string;
}

export interface RegionFeature {
  id: number;
  name: string;
  length: number;
  area: number;
}

export interface BasinFeature {
  name: string;
}

export interface DateStruct {
  /**
   * The year, for example 2016
   */
  year: number;
  /**
   * The month, for example 1=Jan ... 12=Dec
   */
  month: number;
  /**
   * The day of month, starting at 1
   */
  day: number;
}

export interface Schedules extends Array<Schedule> {}

export interface Schedule {
  id: number;
  name: string;
  is_enabled: boolean;
  created_at: string;
  /** @nullable */
  crontab: string;
  /** @nullable */
  task_name: string;
  /** @nullable */
  task_args: any;
}

export interface OnOffSchedule {
  /** Current status of the schedule */
  enabled: boolean;
  /** Schedule ID */
  id: number;
}
