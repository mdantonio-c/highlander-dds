export interface LegendConfig {
  id: string;
  title: string;
  legend_type: string;
  colors: string[];
  labels: string[];
  ids?: number[];
}

export const LEGEND_DATA: LegendConfig[] = [
  {
    id: "RF",
    legend_type: "legend_box",
    title: "Rainfall erosivity</br><small>[MJ mm ha-1 h-1 yr-1]</small>",
    colors: [
      "rgba(0, 51, 102, 1)",
      "rgba(0, 102, 153, 1)",
      "rgba(0, 115, 153, 1)",
      "rgba(0, 153, 153, 1)",
      "rgba(0, 179, 134, 1)",
      "rgba(0, 204, 102, 1)",
      "rgba(60, 230, 76, 1)",
      "rgba(119, 255, 51, 1)",
      "rgba(153, 255, 102, 1)",
      "rgba(255, 255, 102, 1)",
      // "rgba(255, 255, 102, 1)",
      // "rgba(153, 255, 102, 1)",
      // "rgba(119, 255, 51, 1)",
      // "rgba(60, 230, 76, 1)",
      // "rgba(0, 204, 102, 1)",
      // "rgba(0, 179, 134, 1)",
      // "rgba(0, 153, 153, 1)",
      // "rgba(0, 115, 153, 1)",
      // "rgba(0, 102, 153, 1)",
      // "rgba(0, 51, 102, 1)",
    ],
    labels: [
      ">8000",
      "6000",
      "4000",
      "3000",
      "2500",
      "2000",
      "1500",
      "1000",
      "500",
      "0",

      // "0-500",
      // "500-1000",
      // "1000-1500",
      // "1500-2000",
      // "2000-2500",
      // "2500-3000",
      // "3000-4000",
      // "4000-6000",
      // "6000-8000",
      // ">8000",
    ],
  },
  {
    id: "SL",
    legend_type: "legend_box",
    title: "Soil loss</br><small>[t ha-1 yr-1]</small>",
    colors: [
      "#993404",
      "#b64708",
      "#d25a0c",
      "#e67217",
      "#f68c23",
      "#fea73f",
      "#fec46c",
      "#ffde96",
      "#ffefb5",
      "#ffffd4",

      // "#ffffd4",
      // "#ffefb5",
      // "#ffde96",
      // "#fec46c",
      // "#fea73f",
      // "#f68c23",
      // "#e67217",
      // "#d25a0c",
      // "#b64708",
      // "#993404",
    ],
    labels: [
      ">2000",
      "1000",
      "500",
      "100",
      "50",
      "10",
      "5",
      "2.5",
      "1",
      "0",

      // "0", "1", "2.5", "5", "10", "50", "100", "500", "1000", ">2000"
    ],
  },
  {
    id: "WC",
    legend_type: "legend_box",
    title: "Wind chill</br><small>°C</small>",
    colors: [
      "#cccccc",
      "#d20000",
      "#f40000",
      "#ff9900",
      "#f9d700",
      "#ccf900",
      "#00ff00",
      "#00d200",
      "#00a400",
      "#00aa88",
      "#00a4bb",
      "#0082dd",
      "#0000dd",
      "#2d00a4",
      "#7d008e",
      "#000000",
    ],
    labels: [
      "45",
      "40",
      "35",
      "30",
      "25",
      "20",
      "15",
      "10",
      "5",
      "0",
      "-5",
      "-10",
      "-15",
      "-20",
      "-25",
      "-30",
    ],
  },
  {
    id: "H",
    legend_type: "legend_box",
    title: "Humidex</br><small>°C</small>",
    colors: [
      "#cccccc",
      "#d20000",
      "#f40000",
      "#ff9900",
      "#f9d700",
      "#ccf900",
      "#00ff00",
      "#00d200",
      "#00a400",
      "#00aa88",
      "#00a4bb",
      "#0082dd",
      "#0000dd",
      "#2d00a4",
      "#7d008e",
      "#000000",
    ],
    labels: [
      "45",
      "40",
      "35",
      "30",
      "25",
      "20",
      "15",
      "10",
      "5",
      "0",
      "-5",
      "-10",
      "-15",
      "-20",
      "-25",
      "-30",
    ],
  },
  {
    id: "DI",
    legend_type: "legend_box",
    title: "Discomfort</br>index thom</br><small>°C</small>",
    colors: [
      "#cccccc",
      "#d20000",
      "#f40000",
      "#ff9900",
      "#f9d700",
      "#ccf900",
      "#00ff00",
      "#00d200",
      "#00a400",
      "#00aa88",
      "#00a4bb",
      "#0082dd",
      "#0000dd",
      "#2d00a4",
      "#7d008e",
      "#000000",
    ],
    labels: [
      "45",
      "40",
      "35",
      "30",
      "25",
      "20",
      "15",
      "10",
      "5",
      "0",
      "-5",
      "-10",
      "-15",
      "-20",
      "-25",
      "-30",
    ],
  },
  {
    id: "AT",
    legend_type: "legend_box",
    title: "Apparent</br>temperature</br><small>°C</small>",
    colors: [
      // "#ffcc00",
      // "#ff0000",
      // "#990000",
      // "#990099",
      // "#ff00ff",
      // "#7200ff",
      // "#008cff",
      // "#00e5cc",
      // "#00b200",
      // "#ffff00",
      // "#ff9900",
      // "#cc0000",
      // "#660000",
      // "#990099",
      // "#bf00ff",
      // "#ffcc00",
      // "#ff9900",
      "#cccccc",
      "#d00000",
      "#ee0000",
      "#ff7500",
      "#ffcd00",
      "#e0f300",
      "#58ff00",
      "#00e400",
      "#00ba00",
      "#009e28",
      "#00aa9b",
      "#009cd3",
      "#0070dd",
      "#0000cd",
      "#4d00a0",
      "#7a008b",
      "#000000",
    ],
    labels: [
      "50",
      "45",
      "40",
      "35",
      "30",
      "25",
      "20",
      "15",
      "10",
      "5",
      "0",
      "-5",
      "-10",
      "-15",
      "-20",
      "-25",
      "-30",
    ],
  },
  {
    id: "T_2M",
    legend_type: "legend_box",
    title: "Mean</br>Temperature</br><small>°C</small>",
    colors: [
      "#ccbcbc",
      "#cc1c1c",
      "#d70000",
      "#ec0000",
      "#ff2100",
      "#ff9900",
      "#ffc500",
      "#f4e200",
      "#d8f500",
      "#93ff00",
      "#00ff00",
      "#00e200",
      "#00c700",
      "#00ac00",
      "#009d1d",
      "#00aa88",
      "#00aaa5",
      "#009fcb",
      "#008add",
      "#005ddd",
      "#0000dd",
      "#0000b1",
      "#58009f",
      "#810092",
      "#5d006b",
      "#000000",
    ],
    labels: [
      "35",
      "33",
      "31",
      "29",
      "27",
      "25",
      "23",
      "21",
      "19",
      "17",
      "15",
      "13",
      "11",
      "9",
      "7",
      "5",
      "3",
      "1",
      "-1",
      "-3",
      "-5",
      "-7",
      "-9",
      "-11",
      "-13",
      "-15",
    ],
  },
  {
    // TODO set the legend
    id: "FTY",
    legend_type: "legend_box",
    title: "Forest type",
    colors: ["#018571", "#a6611a"],
    labels: ["Broadleaved", "Coniferous"],
  },
  {
    // TODO set the legend
    id: "BIOTEMP",
    legend_type: "legend_box",
    title: "Temperature</br><small>°C</small>",
    colors: [
      "#7a0403",
      "#bd2002",
      "#ea4c0c",
      "#fe9028",
      "#f2c93a",
      "#c3f234",
      "#7eff55",
      "#2af0a1",
      "#1fc9de",
      "#4390fe",
      "#4454c4",
      "#30123b",
    ],
    labels: [
      "40",
      "35",
      "30",
      "25",
      "20",
      "15",
      "10",
      "5",
      "0",
      "-5",
      "-10",
      "-15",
    ],
  },
  {
    // TODO set the legend
    id: "BIOPRP",
    legend_type: "legend_box",
    title: "Precipitation </br><small>[mm]</small>",
    colors: [
      "#08306b",
      "#084e98",
      "#1967ad",
      "#2e7ebc",
      "#4695c8",
      "#63a9d3",
      "#85bcdc",
      "#a6cee4",
      "#c2daee",
      "#d5e5f4",
      "#e6f0fa",
      "#f7fbff",
    ],
    labels: [
      "3500",
      "3000",
      "2500",
      "2000",
      "1500",
      "1000",
      "750",
      "500",
      "250",
      "100",
      "75",
      "50",
    ],
  },
  {
    // TODO set the legend
    id: "FOREST",
    legend_type: "legend_box",
    title: "Forest species suitability",
    colors: [
      "#00441b",
      "#006d2c",
      "#1d8641",
      "#359f54",
      "#54b567",
      "#7bc87c",
      "#9ed898",
      "#bce4b5",
      "#d5efcf",
      "#eaf7e5",
      "#f7fcf5",
    ],
    labels: [
      "1.0",
      "0.9",
      "0.8",
      "0.7",
      "0.6",
      "0.5",
      "0.4",
      "0.3",
      "0.2",
      "0.1",
      "0.0",
    ],
  },
  {
    id: "CompI",
    legend_type: "legend_box",
    title: "Climate indicators for grapevine vocationality",
    colors: [
      "#018571",
      "#34a291",
      "#67bfb1",
      "#97d5cc",
      "#c6e5e1",
      "#f5f5f5",
      "#ede1c5",
      "#e4cc95",
      "#d4af69",
      "#bd8841",
      "#a6611a",
    ],
    labels: [
      "1.0",
      "0.9",
      "0.8",
      "0.7",
      "0.6",
      "0.5",
      "0.4",
      "0.3",
      "0.2",
      "0.1",
      "0.0",
    ],
  },
  {
    id: "aflatossine",
    legend_type: "legend_box",
    title: "Risk class indicator of aflatoxin",
    colors: [
      "#ca00ff",
      "#ca00ba",
      "#ca0074",
      "#ca002e",
      "#df5251",
      "#eda889",
      "#c9b5ac",
      "#8c8c8c",
      "#404040",
    ],
    labels: ["40", "35", "30", "25", "20", "15", "10", "5", "0"],
  },
];
