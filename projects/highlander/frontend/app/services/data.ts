export interface LegendConfig {
  id: string;
  title: string;
  legend_type: string;
  colors: string[];
  labels: string[];
}

export const LEGEND_DATA: LegendConfig[] = [
  {
    id: "RF",
    legend_type: "legend_prec",
    title: "R-factor</br><small>[MJ mm ha-1 h-1 yr-1]</small>",
    colors: [
      "rgba(255, 255, 102, 1)",
      "rgba(153, 255, 102, 1)",
      "rgba(119, 255, 51, 1)",
      "rgba(60, 230, 76, 1)",
      "rgba(0, 204, 102, 1)",
      "rgba(0, 179, 134, 1)",
      "rgba(0, 153, 153, 1)",
      "rgba(0, 115, 153, 1)",
      "rgba(0, 102, 153, 1)",
      "rgba(0, 51, 102, 1)",
    ],
    labels: [
      "0-500",
      "500-1000",
      "1000-1500",
      "1500-2000",
      "2000-2500",
      "2500-3000",
      "3000-4000",
      "4000-6000",
      "6000-8000",
      ">8000",
    ],
  },
  {
    id: "SL",
    legend_type: "legend_prec",
    title: "SL-factor</br><small>[MJ mm ha-1 h-1 yr-1]</small>",
    colors: [
      "rgba(255, 255, 102, 1)",
      "rgba(153, 255, 102, 1)",
      "rgba(119, 255, 51, 1)",
      "rgba(60, 230, 76, 1)",
      "rgba(0, 204, 102, 1)",
      "rgba(0, 179, 134, 1)",
      "rgba(0, 153, 153, 1)",
      "rgba(0, 115, 153, 1)",
      "rgba(0, 102, 153, 1)",
      "rgba(0, 51, 102, 1)",
    ],
    labels: [
      "0-500",
      "500-1000",
      "1000-1500",
      "1500-2000",
      "2000-2500",
      "2500-3000",
      "3000-4000",
      "4000-6000",
      "6000-8000",
      ">8000",
    ],
  },
];
