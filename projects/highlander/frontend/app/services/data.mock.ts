import { DatasetInfo } from "../types";

export const ADDITIONAL_APPLICATIONS: DatasetInfo[] = [
  {
    id: "pasture",
    label: "Mountain pasture monitoring",
    default: "pasture",
    description:
      "Mountain pasture monitoring using satellite data. The goal of this use case is using satellite remote sensing data to calculate Spectral Vegetation Indices changes across different years or during the same mountain pasture season, providing useful information for a more sustainable pasture management",
    attribution: "",
    contact: {
      name: "Damiano Gianelle",
      email: "damiano.gianelle@fmach.it",
      webpage: null,
    },
    image: "pasture.png",
    doi: null,
    update_frequency: "None",
    license: {
      name: "Free for research",
      url: null,
    },
    publication_date: "2022-06-10T00:00:00.000000Z",
    application: true,
    category: "paneveggio",
    url: "http://labora.dedagroup.it/dashboards/highlander/pascoli/index.html",
  },
  {
    id: "forest",
    label: "Forest monitoring",
    default: "forest",
    description:
      "This use case combines information from airborne remote sensing data (hyperspectral and lidar) and field data in order to produce tree species and aboveground biomass maps, estimated for each individual tree crown.",
    attribution: "",
    contact: {
      name: "Damiano Gianelle",
      email: "damiano.gianelle@fmach.it",
      webpage: null,
    },
    image: "forest.jpg",
    doi: null,
    update_frequency: "None",
    license: {
      name: "Free for research",
      url: null,
    },
    publication_date: "2022-06-10T00:00:00.000000Z",
    application: true,
    category: "paneveggio",
    url: "http://labora.dedagroup.it/dashboards/highlander/foreste/index.html",
  },
  {
    id: "vaia",
    label: "Vaia storm",
    default: "vaia",
    description:
      "Vaia storm occurred in northeastern Italy at the end of October 2018 with wind gusts of 200 km/h. Forest windthrows maps have been produced using high spatial resolution multispectral satellite images with two-dimensional Change Vector Analysis (CVA).",
    attribution: "",
    contact: {
      name: "Damiano Gianelle",
      email: "damiano.gianelle@fmach.it",
      webpage: null,
    },
    image: "vaia-storm.jpg",
    doi: null,
    update_frequency: "None",
    license: {
      name: "Free for research",
      url: null,
    },
    publication_date: "2022-06-10T00:00:00.000000Z",
    application: true,
    category: "paneveggio",
    url: "http://labora.dedagroup.it/dashboards/highlander/vaia/index.html",
  },
  {
    id: "treetalkers",
    label: "Forest trees physiological conditions monitoring",
    default: "treetalkers",
    description:
      "Forest trees physiological conditions monitoring inside natural park of Paneveggio, based on TreeTalker sensors IoT technology. Two networks with 25 TreeTalker sensors each, one in a beech and one in a spruce forest, have been installed inside the natural park for continuous monitoring of the following parameters, measured for each single tree: leaves spectrum reflectance, trunk growth, water usage, soil and stem humidity, air temperature, and plant stability. Data gathered can be used to understand the response of trees to climate.",
    attribution: "",
    contact: {
      name: "Damiano Gianelle",
      email: "damiano.gianelle@fmach.it",
      webpage: null,
    },
    image: "tree-talker.jpg",
    doi: null,
    update_frequency: "None",
    license: {
      name: "Free for research",
      url: null,
    },
    publication_date: "2022-06-10T00:00:00.000000Z",
    application: true,
    category: "paneveggio",
    url: "http://labora.dedagroup.it/dashboards/highlander/treetalkers/index.html",
  },
];
