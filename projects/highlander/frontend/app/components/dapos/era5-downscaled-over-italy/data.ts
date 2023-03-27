import { CodeLabel } from "../../../types";

// export const INDICATORS: CodeLabel[] = [
//   {
//     code: "ANN",
//     label: "Mean temperature 2m",
//     // product: "mean-temperature",
//   },
//   {
//     code: "DJF",
//     label: "Mean winter temperature 2m",
//     // product: "mean-temperature",
//   },
//   {
//     code: "MAM",
//     label: "Mean spring temperature 2m",
//     // product: "mean-temperature",
//   },
//   {
//     code: "JJA",
//     label: "Mean summer temperature 2m",
//     // product: "mean-temperature",
//   },
//   {
//     code: "SON",
//     label: "Mean autumn temperature 2m",
//     // product: "mean-temperature",
//   },
// ];

export const INDICATORS: CodeLabel[] = [
  {
    code: "T_2M",
    label: "Mean air temperature 2m",
    plotLabel: "Mean temperature 2m",
    product: "mean-temperature-2m",
  },
  {
    code: "TMAX_2M",
    label: "Maximum air temperature 2m",
    plotLabel: "Maximum temperature 2m",
    product: "maximum-temperature-2m",
  },
  {
    code: "TMIN_2M",
    label: "Minimum air temperature 2m",
    plotLabel: "Minimum temperature 2m",
    product: "minimum-temperature-2m",
  },
];

export const TIME_PERIODS = [
  { code: "ANN", label: "Annual" },
  { code: "DJF", label: "Winter (December-January-February)" },
  { code: "MAM", label: "Spring (March-April-May)" },
  { code: "JJA", label: "Summer (June-July-August)" },
  { code: "SON", label: "Autumn (September-October-November)" },
];

export const ADMINISTRATIVE_AREAS = [
  { code: "italy", label: "Italy" },
  { code: "regions", label: "Regions" },
  { code: "provinces", label: "Provinces" },
  { code: "municipalities", label: "Municipalities" },
  { code: "basins", label: "Hydrographic Basins" },
];

export const REFERENCE_PERIODS = [
  { code: "1981-2010", label: "1981-2010" },
  { code: "1991-2020", label: "1991-2020" },
];
