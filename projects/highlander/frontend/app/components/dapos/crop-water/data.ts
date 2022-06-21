import { CodeLabel } from "../../../types";
import { LegendConfig } from "../../../services/data";
import * as L from "leaflet";

export interface Area extends CodeLabel {
  coords: L.LatLng;
  zLevel?: number;
}

export const ADMINISTRATIVE_AREAS: Area[] = [
  {
    code: "C5",
    label: "Renana",
    coords: L.latLng([44.56406, 11.49889]),
    zLevel: 11,
  },
  {
    code: "C4",
    label: "Burana",
    coords: L.latLng([44.72122, 11.15122]),
    zLevel: 10,
  },
  {
    code: "C7",
    label: "Romagna",
    coords: L.latLng([44.22606, 12.40426]),
    zLevel: 10,
  },
];

export const LAYERS: CodeLabel[] = [
  {
    code: "irri",
    label: "Irrigation monthly forecast",
  },
  {
    code: "prp",
    label: "Precipitation monthly forecast",
  },
  {
    code: "crop",
    label: "Crop cultures",
  },
];

export const LEGEND_DATA: LegendConfig[] = [
  {
    id: "irri",
    legend_type: "legend_box",
    title: "Monthly forecasted irrigation</br><small>[mm]</small>",
    colors: [
      "#ffffff",
      "#1dac48",
      "#3ff743",
      "#aef716",
      "#effa0f",
      "#feba5e",
      "#ed6e43",
      "#ed2147",
      "#c01518",
      "#ce16a4",
    ],
    labels: [
      "0-5",
      "5-25",
      "25-50",
      "50-75",
      "75-100",
      "100-125",
      "125-150",
      "150-175",
      "175-200",
      "200-250",
    ],
  },
  {
    id: "prp",
    legend_type: "legend_box",
    title: "Monthly forecasted precipitation</br><small>[mm]</small>",
    colors: [
      "#fefff5",
      "#fafba5",
      "#c2ed9b",
      "#7eedba",
      "#40dde5",
      "#0fbfe5",
      "#1069ed",
      "#3c10ce",
      "#8110ce",
      "#d110ce",
    ],
    labels: [
      "0-5",
      "5-25",
      "25-50",
      "50-75",
      "75-100",
      "100-125",
      "125-150",
      "150-200",
      "200-300",
      "300-400",
    ],
  },
  {
    id: "crop",
    legend_type: "legend_box",
    title: "Crop",
    colors: [
      "rgba(255,0,0,100)",
      "rgba(254.59,255,0,100)",
      "rgba(0,255,0,100)",
      "rgba(160,32,240,100)",
      "rgba(255,0,255,100)",
      "rgba(254.62,127,80,100)",
      "rgba(127,255,212,100)",
      "rgba(216,191,216,100)",
      "rgba(218,112,216,100)",
      "rgba(205,133,0,100)",
      "rgba(85,26,139,100)",
      "rgba(255,162,0,100)",
      "rgba(110,110,110,100)",
      "rgba(247,135,173,100)",
      "rgba(130,130,130,100)",
    ],
    labels: [
      "Summer crop",
      "Winter crop",
      "Meadow alfalfa and all season crop",
      "Vineyard",
      "Orchard generic",
      "Kiwi",
      "Apricot",
      "Cherry",
      "Kaki",
      "Apple",
      "Pear",
      "Peach",
      "Plum",
      "Woods",
      "All other crops"
    ],
    ids: [1, 2, 3, 12, 13, 14, 20, 21, 22, 23, 24, 25, 26, 27]
  },
];

export interface CropInfo {
  ANNO: number;
  AREA__HA_: number;
  ID_CASE: string;
  ID_CLASS: string;
  ID_CROP: number;
  ID_METEO: string;
  ID_SOIL: number;
  Id: number;
  crop: number;
  hectares: number;
  irri_05: number;
  irri_25: number;
  irri_50: number;
  irri_75: number;
  irri_95: number;
  prec_05: number;
  prec_25: number;
  prec_50: number;
  prec_75: number;
  prec_95: number;
}
