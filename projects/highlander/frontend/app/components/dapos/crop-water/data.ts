import { CodeLabel } from "../../../types";
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
