import { CodeLabel } from "../../../types";
import * as L from "leaflet";

export interface Area extends CodeLabel {
  coords: L.LatLng;
  zLevel?: number;
}

export const ADMINISTRATIVE_AREAS: Area[] = [
  {
    code: "renana",
    label: "Renana",
    coords: L.latLng([44.5, 11.33]),
    zLevel: 12,
  },
  {
    code: "burana",
    label: "Burana",
    coords: L.latLng([44.721, 11.151]),
    zLevel: 10,
  },
  {
    code: "romagna",
    label: "Romagna",
    coords: L.latLng([44.06454, 12.44987]),
    zLevel: 10,
  },
];
