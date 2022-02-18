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
    code: "Irrigation",
    label: "Irrigation monthly forecast",
  },
  {
    code: "Precipitation",
    label: "Precipitation monthly forecast",
  },
  {
    code: "Crop",
    label: "Crop cultures",
  },
];

export const LEGEND_DATA: LegendConfig[] = [
  {
    id: "Irrigation",
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
    id: "Precipitation",
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
    id: "Crop",
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
      "rgba(139,139,139,100)",
      "rgba(241.6,28.64,99.3,0)",
    ],
    labels: [
      "summer crop",
      "winter crop",
      "meadow alfalfa and all season crop",
      "Vineyard",
      "orchard generic",
      "Kiwi",
      "Apricot",
      "Cherry",
      "Kaki",
      "Apple",
      "Pear",
      "Peach",
      "Plum",
      "woods",
    ],
  },
];
