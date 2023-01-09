import { CodeLabel } from "../../../types";
import { LegendConfig, LegendItem } from "../../../services/data";
import * as L from "leaflet";

export interface Area extends CodeLabel {
  coords: L.LatLng;
  zLevel?: number;
}

export const ADMINISTRATIVE_AREAS: { [key: string]: Area[] } = {
  "crop-water": [
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
  ],
  "irri-proj": [
    {
      code: "Puglia",
      label: "Ofanto (Puglia)",
      coords: L.latLng([41.281576, 15.983154]),
      zLevel: 11,
    },
    {
      code: "Faenza",
      label: "Faenza",
      coords: L.latLng([44.347911, 11.897944]),
      zLevel: 11,
    },
    /*{
      code: "TRE",
      label: "Piana Rotaliana (Trento)",
      coords: L.latLng([46.228798, 11.132473]),
      zLevel: 11,
    },*/
  ],
};

export const PERCENTILES: number[] = [5, 25, 50, 75, 95];

export const LAYERS: { [key: string]: CodeLabel[] } = {
  "crop-water": [
    {
      code: "irri",
      label: "Irrigation", // Irrigation monthly forecast
    },
    {
      code: "prp",
      label: "Precipitation", // Precipitation monthly forecast
    },
    {
      code: "crop",
      label: "Crop", // Crop cultures
    },
  ],
  "irri-proj": [
    {
      code: "crop",
      label: "Crop", // Crop cultures
    },
    {
      code: "irri_1991_2020",
      label: "Irrigation 1991-2020",
    },
    {
      code: "irri_2021_2050",
      label: "Irrigation 2021-2050",
    },
  ],
};

const CROP_PALETTE_A: LegendItem[] = [
  {
    id: 1,
    label: "Summer crop",
    color: "rgba(255,0,0,100)",
  },
  {
    id: 2,
    label: "Winter crop",
    color: "rgba(254,255,0,100)",
  },
  {
    id: 3,
    label: "Meadow alfalfa and all season crop",
    color: "rgba(0,255,0,100)",
  },
  {
    id: 12,
    label: "Vineyard",
    color: "rgb(138,46,91)",
  },
  {
    id: 13,
    label: "Orchard generic",
    color: "rgba(255,0,255,100)",
  },
  {
    id: 14,
    label: "Kiwi",
    color: "rgba(254,127,80,100)",
  },
  {
    id: 17,
    label: "Woody plants",
    color: "rgba(247,135,173,100)",
  },
  {
    id: 20,
    label: "Apricot",
    color: "rgba(127,255,212,100)",
  },
  {
    id: 21,
    label: "Cherry",
    color: "rgba(216,191,216,100)",
  },
  {
    id: 22,
    label: "Kaki",
    color: "rgba(218,112,216,100)",
  },
  {
    id: 23,
    label: "Apple",
    color: "rgba(205,133,0,100)",
  },
  {
    id: 24,
    label: "Pear",
    color: "rgb(128, 128, 0)",
  },
  {
    id: 25,
    label: "Peach",
    color: "rgba(255,162,0,100)",
  },
  {
    id: 26,
    label: "Plum",
    color: "rgba(110,110,110,100)",
  },
  {
    id: 27,
    label: "All other crops",
    color: "rgba(130,130,130,100)",
  },
];

const CROP_PALETTE_B: LegendItem[] = [
  {
    id: 211,
    label: "Not irrigated (Wheat)",
    color: "rgba(254,255,0,100)",
  },
  {
    id: 221,
    label: "Vineyards",
    // color: "rgb(138,46,91)"
    color: "rgb(114,47,55)",
  },
  {
    id: 222,
    label: "Fruit trees (Olive)",
    color: "rgba(0,255,0,100)",
  },
  {
    id: 223,
    label: "Olive",
    color: "rgb(128, 128, 0)",
  },
  {
    id: 242,
    label: "Complex Cultivation pattern (Tomato)",
    color: "rgba(255,0,0,100)",
  },
  {
    id: 311,
    label: "Natural areas",
    color: "rgb(65,105,225)",
  },
];

const IRRI_PALETTE: LegendItem[] = [
  { label: "0-5", color: "#ffffff" },
  { label: "5-15", color: "#1dac48" },
  { label: "15-30", color: "#3ff743" },
  { label: "30-50", color: "#aef716" },
  { label: "50-75", color: "#effa0f" },
  { label: "75-100", color: "#feba5e" },
  { label: "100-125", color: "#ed6e43" },
  { label: "125-150", color: "#ed2147" },
  { label: "150-175", color: "#c01518" },
  { label: "175-200", color: "#ce16a4" },
];

const IRRI_PALETTE_EXT: LegendItem[] = [
  { label: "0-1", color: "#ffffff" },
  { label: "1-150", color: "#1dac48" },
  { label: "150-200", color: "#3ff743" },
  { label: "200-250", color: "#aef716" },
  { label: "250-300", color: "#effa0f" },
  { label: "300-350", color: "#feba5e" },
  { label: "350-400", color: "#ed6e43" },
  { label: "400-450", color: "#ed2147" },
  { label: "450-500", color: "#c01518" },
];

const PREC_PALETTE: LegendItem[] = [
  { label: "0-5", color: "#fefff5" },
  { label: "5-25", color: "#fafba5" },
  { label: "25-50", color: "#c2ed9b" },
  { label: "50-75", color: "#40dde5" },
  { label: "75-100", color: "#40dde5" },
  { label: "100-125", color: "#0fbfe5" },
  { label: "125-150", color: "#1069ed" },
  { label: "150-200", color: "#3c10ce" },
  { label: "200-300", color: "#8110ce" },
  { label: "300-400", color: "#d110ce" },
];

export const LEGEND_DATA: { [key: string]: LegendConfig[] } = {
  "crop-water": [
    {
      id: "irri",
      legend_type: "legend_box",
      title: "Monthly forecasted irrigation</br><small>[mm]</small>",
      items: IRRI_PALETTE,
    },
    {
      id: "prp",
      legend_type: "legend_box",
      title: "Monthly forecasted precipitation</br><small>[mm]</small>",
      items: PREC_PALETTE,
    },
    {
      id: "crop",
      legend_type: "legend_box",
      title: "Crop",
      items: CROP_PALETTE_A,
    },
  ],
  "irri-proj": [
    {
      id: "crop",
      legend_type: "legend_box",
      title: "Crop",
      items: CROP_PALETTE_A,
      applyTo: ["Faenza"],
    },
    {
      id: "crop",
      legend_type: "legend_box",
      title: "Crop",
      items: CROP_PALETTE_B,
      applyTo: ["Puglia"],
    },
    {
      id: "irri_1991_2020",
      legend_type: "legend_box",
      title: "Annual irrigation 1991-2020</br><small>[mm]</small>",
      items: IRRI_PALETTE_EXT,
    },
    {
      id: "irri_2021_2050",
      legend_type: "legend_box",
      title: "Annual irrigation 2021-2050</br><small>[mm]</small>",
      items: IRRI_PALETTE_EXT,
    },
  ],
};

export interface CropInfo {
  ANNO: number;
  AREA__HA_: number;
  ID_CASE: string;
  ID_CLASS: string;
  ID_CROP: string;
  ID_METEO: string;
  ID_SOIL: number;

  Id: number;
  crop?: number; // same as ID_CROP
  hectares: number;

  /* Irrigation */
  irri_05: number;
  irri_25: number;
  irri_50: number;
  irri_75: number;
  irri_95: number;

  /* Precipitation */
  prec_05: number;
  prec_25: number;
  prec_50: number;
  prec_75: number;
  prec_95: number;
}
