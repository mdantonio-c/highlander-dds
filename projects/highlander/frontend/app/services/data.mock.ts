import { DatasetInfo } from "../types";

export const ADDITIONAL_APPLICATIONS: DatasetInfo[] = [
  {
    id: "crop-water",
    label: "Sub-seasonal irrigation forecasts",
    default: "crop-water",
    description: "dataset A",
    attribution: "",
    contact: {
      name: "Fausto Tomei",
      email: "ftomei@arpae.it",
      webpage: null,
    },
    image: "crop-water.jpg",
    doi: null,
    update_frequency: "weekly",
    license: {
      name: "Free for research",
      url: null,
    },
    publication_date: "2021-08-10T00:00:00.000000Z",
    application: true,
    category: "forest",
    url: "http://cineca.it",
  },
  {
    id: "crop-water",
    label: "Pippo",
    default: "crop-water",
    description: "dataset A",
    attribution: "",
    contact: {
      name: "Fausto Tomei",
      email: "ftomei@arpae.it",
      webpage: null,
    },
    image: "crop-water.jpg",
    doi: null,
    update_frequency: "weekly",
    license: {
      name: "Free for research",
      url: null,
    },
    publication_date: "2021-08-10T00:00:00.000000Z",
    application: true,
  },
];
