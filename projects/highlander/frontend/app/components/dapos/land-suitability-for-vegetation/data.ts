import { CodeLabel } from "../../../types";
import * as L from "leaflet";

export interface BoundingArea {
  center: L.LatLng;
  zoom: number;
}

export const INDICATORS: CodeLabel[] = [
  {
    code: "CompI",
    label: "Climate indicators for grapevine vocationality",
  },
  {
    code: "aflatossine",
    label: "Risk class indicator of aflatoxin",
  },
];

export const BOUNDING_BOX: BoundingArea = {
  center: L.latLng([45.2610218282163, 7.920205809104651]),
  zoom: 7.75,
};
