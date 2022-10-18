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
    label: "Mean temperature 2m",
    product: "mean-temperature-2m",
  },
];

export const TIME_PERIODS = [
  { code: "ANN", label: "Yearly" },
  { code: "DJF", label: "Winter" },
  { code: "MAM", label: "Spring" },
  { code: "JJA", label: "Summer" },
  { code: "SON", label: "Autumn" },
];

export const ADMINISTRATIVE_AREAS = [
  { code: "italy", label: "Italy" },
  { code: "regions", label: "Regions" },
  { code: "provinces", label: "Provinces" },
];
