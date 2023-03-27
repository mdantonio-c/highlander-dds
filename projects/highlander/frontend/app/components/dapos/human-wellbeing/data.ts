import { CodeLabel } from "../../../types";

export const INDICATORS: CodeLabel[] = [
  {
    code: "WC",
    label: "Wind Chill",
  },
  {
    code: "H",
    label: "Humidex",
  },
  {
    code: "DI",
    label: "Discomfort Index Thom",
  },
  {
    code: "AT",
    label: "Apparent Temperature",
  },
];

export const ADMINISTRATIVE_AREAS = [
  { code: "italy", label: "Italy" },
  { code: "regions", label: "Regions" },
  { code: "provinces", label: "Provinces" },
  { code: "municipalities", label: "Municipalities" },
];

export const DAILY_METRICS = [
  { code: "daymax", label: "Maximum" },
  { code: "daymin", label: "Minimum" },
  { code: "daymean", label: "Mean" },
];

export const HISTORICAL_TIME_PERIODS = [
  { code: "multi-year", label: "Multi-year" },
  { code: "daily", label: "Day" },
];

export const FUTURE_TIME_PERIODS = [
  { code: "ANN", label: "Annual" },
  { code: "DJF", label: "Winter" },
  { code: "MAM", label: "Spring" },
  { code: "JJA", label: "Summer" },
  { code: "SON", label: "Autumn" },
];

export const PERIODS = [
  { code: "1991_2020", label: "1991-2020" },
  { code: "2021_2050", label: "2021-2050" },
];
