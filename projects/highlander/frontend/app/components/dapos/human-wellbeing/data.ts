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
  // { code: "municipalities", label: "Municipalities" },
];
