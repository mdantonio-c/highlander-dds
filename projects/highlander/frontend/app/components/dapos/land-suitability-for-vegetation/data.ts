import { CodeLabel } from "../../../types";
import * as L from "leaflet";

export interface BoundingArea {
  center: L.LatLng;
  zoom: number;
}

export const TIMERANGES = ["1991-2020", "2021-2050"];

export const INDICATORS: CodeLabel[] = [
  {
    code: "CompI",
    label: "Climate indicators for grapevine vocationality",
    band: "CompI_index",
    style: "Grapevine_vocationality",
  },
  {
    code: "aflatossine",
    label: "Risk class indicator of aflatoxin",
    band: "Index_of_Aflatoxin",
    style: "Mycotoxins_cereals",
  },
  {
    code: "forest",
    label: "Probability maps of changes in forest species suitability ",
    band: "GRAY_INDEX",
    style: "various",
  },
];

export const SPECIES: CodeLabel[] = [
  {
    code: "sweet-chestnut",
    label: "Sweet chestnut (Castanea sativa)",
  },
  {
    code: "european-beech",
    label: "European beech (Fagus sylvatica)",
  },
  {
    code: "european-larch-and-swiss-stone-pine",
    label: "European larch (Larix decidua) and Swiss stone pine (Pinus cembra)",
  },
  {
    code: "mesophilic-oaks-and-common-hornbeam",
    label:
      "Mesophilic oaks (European oak Quercus robur, sessile oak Q.petraea) and common hornbeam (Carpinus betulus)",
  },
  {
    code: "other-broadleaves",
    label:
      "Other broadleaves (common alder Alnus glutinosa, grey alder A.incana, sycamore maple Acer pseudoplatanus, field maple A.campestre, silver birch Betula pendula, common ash Fraxinus excelsior, manna ash F.ornus, common aspen Populus tremula, wild cherry Prunus avium, whitebeam Sorbus aria, wild service tree S.torminalis, and rowan S.aucuparia)",
  },
  {
    code: "norway-spruce-and-silver-fir",
    label: "Norway spruce (Picea abies) and Silver fir (Abies alba)",
  },
  {
    code: "scots-pine",
    label: "Scots pine (Pinus sylvestris)",
  },
  {
    code: "black-locust",
    label: "Black locust (Robinia pseudoacacia)",
  },
  {
    code: "thermic-oaks-and-european-hop-hornbeam",
    label:
      "Thermic oaks (downy oak Quercus pubescens, Turkey oak Q.cerris) and European hop-hornbeam (Ostrya carpinifolia)",
  },
];

export const MAPS: CodeLabel[] = [
  {
    code: "HS",
    label: "Habitat Suitability",
    style: "vegetation-suitability-Piedmont",
  },
  {
    code: "range-map",
    label: "Binary Range",
    style: "vegetation-suitability-Piedmont",
  },
  {
    code: "delta-suit",
    label: "Delta Suitability",
    style: "vegetation-delta-Piedmont",
  },
  {
    code: "rangesize-change",
    label: "Range size change",
    style: "vegetation-rangesize-Piedmont",
  },
];

export const BOUNDING_BOX: BoundingArea = {
  center: L.latLng([45.2610218282163, 7.920205809104651]),
  zoom: 7.75,
};
