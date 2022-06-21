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
  // { code: "municipalities", label: "Municipalities" },
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
    product: "RAINFALL_EROSIVITY",
    models: [...Array(12)].map((_, i) => `${i + 1}`),
  },
  SL: {
    product: "SOIL_LOSS",
    models: [...Array(12)].map((_, i) => `${i + 1}`),
  },
};
