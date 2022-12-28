import { CodeLabel, IndicatorsCodeLabel } from "../../../types";

export const INDICATORS: IndicatorsCodeLabel[] = [
  {
    code: "FTY",
    label: "Forest types",
    product: "forest-type",
  },
  {
    code: "FOREST",
    label: "Forest species suitability",
    product: "forest-species-suitability",
  },
  {
    code: "BIOTEMP",
    label: "Bioclimatic indicator (temperature)",
    product: "bioclimatic-temperatures",
  },
  {
    code: "BIOPRP",
    label: "Bioclimatic indicator (precipitation)",
    product: "bioclimatic-precipitations",
  },
];

export const BIOTEMPERATURES: CodeLabel[] = [
  {
    code: "BIO1",
    label: "Annual Mean Temperature",
  },
  {
    code: "BIO2",
    label: "Mean Diurnal Range (Mean of monthly (max temp - min temp))",
  },
  {
    code: "BIO3",
    label: "Isothermality (BIO2/BIO7) (×100)",
  },
  {
    code: "BIO4",
    label: "Temperature Seasonality (standard deviation)", // ×100
  },
  {
    code: "BIO5",
    label: "Max Temperature of Warmest Month",
  },
  {
    code: "BIO6",
    label: "Min Temperature of Coldest Month",
  },
  {
    code: "BIO7",
    label: "Temperature Annual Range (BIO5-BIO6)",
  },
  {
    code: "BIO8",
    label: "Mean Temperature of Wettest Quarter",
  },
  {
    code: "BIO9",
    label: "Mean Temperature of Driest Quarter",
  },
  {
    code: "BIO10",
    label: "Mean Temperature of Warmest Quarter",
  },
  {
    code: "BIO11",
    label: "Mean Temperature of Coldest Quarter",
  },
];

export const BIOPRECIPITATIONS: CodeLabel[] = [
  {
    code: "BIO12",
    label: "Annual Precipitation",
  },
  {
    code: "BIO13",
    label: "Precipitation of Wettest Month",
  },
  {
    code: "BIO14",
    label: "Precipitation of Driest Month",
  },
  {
    code: "BIO15",
    label: "Precipitation Seasonality (Coefficient of Variation)",
  },
  {
    code: "BIO16",
    label: "Precipitation of Wettest Quarter",
  },
  {
    code: "BIO17",
    label: "Precipitation of Driest Quarter",
  },
  {
    code: "BIO18",
    label: "Precipitation of Warmest Quarter",
  },
  {
    code: "BIO19",
    label: "Precipitation of Coldest Quarter",
  },
];

export const SPECIES: CodeLabel[] = [
  {
    code: "Abies_alba",
    label: "Silver fir",
  },
  {
    code: "Acer_campestre",
    label: "Field maple",
  },
  {
    code: "Carpinus_betulus",
    label: "Common hornbeam",
  },
  {
    code: "Castanea_sativa",
    label: "Chestnut",
  },
  {
    code: "Corylus_sp",
    label: "Hazel",
  },
  {
    code: "Fagus_sylvatica",
    label: "Beech",
  },
  {
    code: "Fraxinus_ornus",
    label: "Manna ash",
  },
  {
    code: "Larix_decidua",
    label: "European larch",
  },
  {
    code: "Ostrya_carpinifolia",
    label: "European hop hornbeam",
  },
  {
    code: "Picea_abies",
    label: "Norway spruce",
  },
  {
    code: "Pinus_cembra",
    label: "Swiss stone pine",
  },
  {
    code: "Pinus_halepensis",
    label: "Aleppo pine",
  },
  {
    code: "Pinus_pinaster",
    label: "Maritime pine",
  },
  {
    code: "Pinus_sylvestris",
    label: "Scots pine",
  },
  {
    code: "Quercus_cerris",
    label: "Turkey oak",
  },
  {
    code: "Quercus_ilex",
    label: "Holm oak",
  },
  {
    code: "Quercus_petraea",
    label: "Sessile oak",
  },
  {
    code: "Quercus_pubescens",
    label: "Pubescent oak",
  },
  {
    code: "Quercus_robur",
    label: "Pedunculate oak",
  },
  {
    code: "Quercus_suber",
    label: "Cork oak",
  },
];

export const ADMINISTRATIVE_AREAS = [
  { code: "italy", label: "Italy" },
  { code: "regions", label: "Regions" },
  { code: "provinces", label: "Provinces" },
];

export const PERIODS = [
  { code: "1991_2020", label: "1991-2020" },
  { code: "2021_2050", label: "2021-2050" },
];
