import { CodeLabel } from "../../../types";

export const DROUGHTS: CodeLabel[] = [
  {
    code: "m",
    label: "Meteorological",
  },
  {
    code: "h",
    label: "Hydrological",
  },
];

export const VARIABLES: CodeLabel[] = [
  {
    code: "n",
    label: "Number of events",
  },
  {
    code: "d",
    label: "Average duration",
  },
  {
    code: "m",
    label: "Average magnitude",
  },
  {
    code: "i",
    label: "Average intensity",
  },
  {
    code: "dto",
    label: "Total duration",
  },
];

export const ACCUMULATIONS: CodeLabel[] = [
  {
    code: "1",
    label: "1 month",
  },
  {
    code: "2",
    label: "2 months",
  },
  {
    code: "3",
    label: "3 months",
  },
  {
    code: "4",
    label: "4 months",
  },
  {
    code: "5",
    label: "5 months",
  },
  {
    code: "6",
    label: "6 months",
  },
  {
    code: "7",
    label: "7 months",
  },
  {
    code: "8",
    label: "8 months",
  },
  {
    code: "9",
    label: "9 months",
  },
  {
    code: "10",
    label: "10 months",
  },
  {
    code: "11",
    label: "11 months",
  },
  {
    code: "12",
    label: "12 months",
  },
];

export const DATASETS: CodeLabel[] = [
  {
    code: "VHR-REA_1989-2020",
    label: "VHR-REA_IT (1989-2020)",
  },
  {
    code: "VHR-REF_1989-2020",
    label: "VHR-PRO_IT (1989-2020)",
  },
  {
    code: "VHR-PRO_2021-2050",
    label: "VHR-PRO_IT (2021-2050)",
  },
];

export const BASINS: CodeLabel[] = [
  {
    code: "Ofanto_Samuele_Cafiero",
    label: "Ofanto a S. Samuele di Cafiero",
    zoom: 8.5,
  },
  {
    code: "Ofanto_Monteverde_Scalo",
    label: "Ofanto a Monteverde Scalo",
    zoom: 8.5,
  },
  {
    code: "Ofanto_Cairano_Scalo",
    label: "Ofanto a Cairano Scalo",
    zoom: 10,
  },
];
