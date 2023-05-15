import { Component, Input } from "@angular/core";
import { DatasetInfo, CropWaterFilter, DateStruct } from "../../../types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";

import * as L from "leaflet";
import * as _ from "lodash";
import { DataService } from "../../../services/data.service";
import {
  ADMINISTRATIVE_AREAS,
  CropInfo,
  decodeCrops,
  LAYERS,
  LEGEND_DATA,
} from "./data";
import { LegendConfig } from "../../../services/data";
import { CropDetailsComponent } from "./crop-details/crop-details.component";

const MAX_ZOOM = 16;
const MIN_ZOOM = 10;
const NORMAL_STYLE = {
  fillColor: null,
  color: "gray",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.8,
};
const HIGHLIGHT_STYLE = {
  weight: 1,
  color: "#ccc",
  fillOpacity: 0.7,
};
const NULL_STYLE = {
  weight: 0,
  opacity: 0,
  fillOpacity: 0,
  interactive: false,
};

@Component({
  selector: "app-crop-water",
  templateUrl: "./crop-water.component.html",
  styleUrls: ["./crop-water.component.scss", "../shared.scss"],
})
export class CropWaterComponent {
  @Input()
  dataset: DatasetInfo;
  isFilterCollapsed = false;
  map: L.Map;
  private legendControl: L.Control;
  zoom: number = 12;
  center: L.LatLng = L.latLng([44.49895, 11.32759]); // default Bologna City
  readonly LEGEND_POSITION = "bottomright";
  availableRuns: DateStruct[];
  selectedPeriod: DateStruct;

  LAYER_OSM = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Open Street Map</a>',
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    },
  );
  options = {
    layers: [this.LAYER_OSM],
    zoom: this.zoom,
    fullscreenControl: true,
    center: this.center,
  };

  filter: CropWaterFilter;
  private geoData: L.LayerGroup = new L.LayerGroup();
  private geojson;

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private modalService: NgbModal,
  ) {}

  isCollapsed = true;

  onMapReady(map: L.Map) {
    this.map = map;
    // position to selected area
    this.map.setView(this.center, this.zoom);
  }

  onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
    this.zoom = this.map.getZoom();
  }

  onMapMove($event) {
    this.center = this.map.getCenter();
  }

  private createLegendControl(legendConfig: LegendConfig): L.Control {
    const legend = new L.Control({ position: this.LEGEND_POSITION });
    legend.onAdd = () => {
      let div = L.DomUtil.create("div", legendConfig.legend_type);
      if (!L.Browser.touch) {
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.on(div, "mousewheel", L.DomEvent.stopPropagation);
      } else {
        L.DomEvent.on(div, "click", L.DomEvent.stopPropagation);
      }

      div.innerHTML += `<h6>${legendConfig.title}</h6>`;
      legendConfig.items.forEach((i) => {
        div.innerHTML +=
          '<div id="' +
          `${i.id}` +
          '"><i style="background:' +
          i.color +
          '"></i><span>' +
          i.label +
          "</span></div>";
      });
      return div;
    };
    return legend;
  }

  async applyFilter(data: CropWaterFilter) {
    const previousLayer = this.filter?.layer || null;
    const previousPeriod = this.filter?.period || null;
    const previousArea = this.filter?.area || null;
    this.filter = data;

    this.spinner.show();
    if (this.dataset.id === "crop-water") {
      // need to wait for the available runs to load
      await this.dataService
        .getRunPeriods("crop-water", "crop-water")
        .toPromise()
        .then((periods) => {
          this.availableRuns = periods;
        });

      if (!this.selectedPeriod) {
        // default to the last run
        data.period = this.availableRuns[0];
        this.selectedPeriod = data.period;
      } else {
        data.period = this.selectedPeriod;
      }
    }

    // force await 100ms in order to show spinner
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("apply filter", this.filter);
    const selectedArea = ADMINISTRATIVE_AREAS[this.dataset.id].find(
      (x) => x.code === data.area,
    );
    this.zoom = selectedArea.zLevel ? selectedArea.zLevel : this.zoom;
    this.center = selectedArea.coords;

    if (this.map) {
      // pan to current area
      this.map.setView(this.center, this.zoom);

      // remove the previous legend
      if (this.legendControl) {
        // when the variable legendControl is populated, the control is added to the map
        // it means that if the variable is not null there is a legend controller on the map
        this.map.removeControl(this.legendControl);
      }
      // if (previousLayer && data.layer !== previousLayer) {
      //   this.map.removeControl(this.legends[previousLayer]);
      // }

      // FIXME update ONLY on area and period
      const update =
        previousArea !== this.filter.area ||
        (previousPeriod !== this.filter.period &&
          this.dataset.id === "crop-water") ||
        (previousLayer !== this.filter.layer &&
          this.dataset.id === "irri-proj");
      // load layer on the map
      this.loadGeoData(update);

      // add attribution
      this.map.attributionControl.addAttribution("&copy; Highlander");
    }
  }

  /**
   * Load geo data on the map
   */
  loadGeoData(update: boolean = true) {
    console.log(`loading geo data [update: ${update}]`);
    if (!this.map) {
      console.warn("Cannot load geo data. Map not available");
      return;
    }

    // first clean up the map from the existing overlays
    this.map.removeLayer(this.geoData);
    this.geoData.clearLayers();
    const percentile: string = this.filter.percentile
      ? String(this.filter.percentile).padStart(2, "0")
      : "";

    // just render a new layer if no need to update data
    if (this.geojson && !update) {
      this.renderOnMap();
      return;
    }

    console.log(`loading geo data... area <${this.filter.area}>`);
    // datastore in form of: {area}_monthlyForecast_{YYYY-MM-DD}
    const datastore =
      this.dataset.id === "crop-water"
        ? `${this.filter.area}_monthlyForecast_${this.periodToString(
            this.filter.period,
          )}`
        : `${this.filter.area}_${this.filter.layer}`;

    // get geojson
    this.dataService
      .getGeoJson(datastore)
      .subscribe(
        (geojson) => {
          this.geojson = geojson;
          this.renderOnMap();
        },
        (error) => {
          console.log("error", error);
          this.notify.showError("Error to load data layer.");
        },
      )
      .add(() => {
        this.spinner.hide();
      });
  }

  printLayerDescription(): string {
    const code = this.filter.layer;
    const found = LAYERS[this.dataset.id].find((x) => x.code === code);
    return found.label || code;
  }

  onPeriodChange(val) {
    // console.log("period changed", val);
    const data = Object.assign({}, this.filter);
    data.period = val;
    this.applyFilter(data);
  }

  isSamePeriod(a: DateStruct, b: DateStruct) {
    return _.isEqual(a, b);
  }

  periodToString(p: DateStruct): string {
    return `${p.year}-${String(p.month).padStart(2, "0")}-${String(
      p.day,
    ).padStart(2, "0")}`;
  }

  private getColorIndex(num: number, legend: LegendConfig): string {
    let layer = this.filter.layer;
    if (layer !== "crop") {
      for (const i of legend.items) {
        const min_max: number[] = i.label
          .split("-", 2)
          .map((num) => parseInt(num, 10));
        if (num >= min_max[0] && num <= min_max[1]) {
          return i.color;
        }
      }
    } else {
      const found = legend.items.find((x) => x.id === num);
      if (found) {
        return found.color;
      }
    }
    // shouldn't be reached
    throw `No color index found: number ${num} - layer<${layer}>`;
  }

  private static getIndicatorValue(
    model: CropInfo,
    filter: CropWaterFilter,
  ): number {
    let prop = filter.layer;
    if (prop.indexOf("_") > -1) {
      // indicator: before_
      prop = prop.substring(0, prop.indexOf("_"));
    }
    // fix indicator id to match value from shapefile
    if (prop === "prp") {
      prop = "prec";
    }
    if (prop === "crop") {
      prop = "ID_CROP";
    }
    const percentile: string = filter.percentile
      ? String(filter.percentile).padStart(2, "0")
      : "";
    const key = prop === "ID_CROP" ? `${prop}` : `${prop}_${percentile}`;
    // console.log(`key: ${key}`);
    // console.log(`val: ${model[key]}`);
    let res = parseInt(model[key], 10);
    if (isNaN(res) && prop === "ID_CROP") {
      res = decodeCrops(model[key]);
    }
    return res;
  }

  private renderOnMap() {
    // console.log("render on the map");
    const legend: LegendConfig = LEGEND_DATA[this.dataset.id].find(
      (x) =>
        x.id === this.filter.layer &&
        (!("applyTo" in x) || x.applyTo.includes(this.filter.area)),
    );
    if (!legend) {
      console.error(`Legend data NOT found for ID<${this.filter.layer}>`);
      this.notify.showError("Bad legend configuration");
      return;
    }
    const comp: CropWaterComponent = this;
    let crops = new Set();
    const jsonLayer = L.geoJSON(this.geojson, {
      style: (feature) => {
        let style = NORMAL_STYLE;
        const props = feature.properties as CropInfo;
        const num = CropWaterComponent.getIndicatorValue(props, comp.filter);
        if (isNaN(num)) {
          return NULL_STYLE;
        }
        crops.add(num);
        style.fillColor = comp.getColorIndex(num, legend);
        return style;
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties as CropInfo;
        const num = CropWaterComponent.getIndicatorValue(props, comp.filter);
        if (!isNaN(num)) {
          const fillColor = comp.getColorIndex(num, legend);
          layer.on({
            mouseover: (e) => this.highlightFeature(e),
            mouseout: (e) => this.resetFeature(e, fillColor),
            click: (e) => this.openDetails(e),
          });
        }
      },
    });
    // console.log("all crop ids: ", ...crops);
    // create the legend
    this.legendControl = this.createLegendControl(legend);
    // add the legend
    this.legendControl.addTo(this.map);

    this.geoData.addLayer(jsonLayer);
    this.geoData.addTo(this.map);
    this.spinner.hide();
  }

  private highlightFeature(e: L.LayerEvent) {
    const layer = e.target;
    layer.setStyle(HIGHLIGHT_STYLE);
  }

  private resetFeature(e, toColor) {
    const layer = e.target;
    let style = NORMAL_STYLE;
    style.fillColor = toColor;
    layer.setStyle(style);
  }

  private openDetails(e: L.LeafletMouseEvent) {
    const feature = e.target.feature;
    const modalRef = this.modalService.open(CropDetailsComponent, {
      size: "lg",
      centered: true,
    });
    modalRef.componentInstance.crop = feature.properties as CropInfo;
    modalRef.componentInstance.filter = this.filter;
    modalRef.componentInstance.dataset = this.dataset.id;
    // need to trigger resize event
    window.dispatchEvent(new Event("resize"));
  }
}
