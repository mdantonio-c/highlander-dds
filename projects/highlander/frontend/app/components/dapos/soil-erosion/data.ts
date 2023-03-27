import { IndicatorsCodeLabel } from "../../../types";

export const INDICATORS: IndicatorsCodeLabel[] = [
  {
    code: "RF",
    label: "R Factor",
    product: "rainfall-erosivity",
  },
  {
    code: "SL",
    label: "Soil Loss",
    product: "soil-loss",
  },
];

export const ADMINISTRATIVE_AREAS = [
  { code: "italy", label: "Italy" },
  { code: "regions", label: "Regions" },
  { code: "provinces", label: "Provinces" },
  { code: "basins", label: "Hydrographic Basins" },
  { code: "municipalities", label: "Municipalities" },
  // { code: "municipalities", label: "Municipalities" },
];

export const PERIODS = [
  { code: "1991_2020", label: "1991-2020" },
  { code: "2021_2050_anomalies", label: "2021-2050" },
];

export interface WMSLayers {
  product: string;
  models: string[];
}

export interface WMSEndpoint {
  [key: string]: WMSLayers;
}

export const SOIL_EROSION_WMS: WMSEndpoint = {
  RF: {
    product: "R",
    models: [...Array(12)].map((_, i) => `${i + 1}`),
  },
  SL: {
    product: "SL",
    models: [...Array(12)].map((_, i) => `${i + 1}`),
  },
};
