import { Component, Input } from "@angular/core";
import { DatasetInfo, CropWaterFilter, DateStruct } from "../../../types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";

import * as L from "leaflet";
import * as shp from "shpjs";
import * as _ from "lodash";
import { DataService } from "../../../services/data.service";
import { ADMINISTRATIVE_AREAS, CropInfo, LAYERS, LEGEND_DATA } from "./data";
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
  styleUrls: ["./crop-water.component.scss"],
})
export class CropWaterComponent {
  @Input()
  dataset: DatasetInfo;
  isFilterCollapsed = false;
  map: L.Map;
  private legends: { [key: string]: L.Control } = {};
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

  onMapReady(map: L.Map) {
    this.map = map;
    // position to selected area
    this.map.setView(this.center, this.zoom);

    this.initLegends(map);
    // add a legend
    if (this.legends[this.filter.layer]) {
      this.legends[this.filter.layer].addTo(map);
    }
  }

  onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
    this.zoom = this.map.getZoom();
  }

  onMapMove($event) {
    this.center = this.map.getCenter();
  }

  private initLegends(map: L.Map) {
    LAYERS.forEach((l) => {
      this.legends[l.code] = this.createLegendControl(l.code);
      console.log(`add legend <${l.code}>`);
    });
  }

  private createLegendControl(id: string): L.Control {
    let config: LegendConfig = LEGEND_DATA.find((x) => x.id === id);
    if (!config) {
      console.error(`Legend data NOT found for ID<${id}>`);
      this.notify.showError("Bad legend configuration");
      return;
    }
    const legend = new L.Control({ position: this.LEGEND_POSITION });
    legend.onAdd = () => {
      let div = L.DomUtil.create("div", config.legend_type);
      if (!L.Browser.touch) {
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.on(div, "mousewheel", L.DomEvent.stopPropagation);
      } else {
        L.DomEvent.on(div, "click", L.DomEvent.stopPropagation);
      }

      div.innerHTML += `<h6>${config.title}</h6>`;
      for (let i = 0; i < config.labels.length; i++) {
        div.innerHTML +=
          '<i style="background:' +
          config.colors[i] +
          '"></i><span>' +
          config.labels[i] +
          "</span><br>";
      }
      return div;
    };
    return legend;
  }

  async applyFilter(data: CropWaterFilter) {
    this.spinner.show();

    const previousLayer = this.filter?.layer || null;
    const previousPeriod = this.filter?.period || null;
    const previousArea = this.filter?.area || null;
    this.filter = data;

    // need to wait for the available runs to load
    await this.dataService
      .getRunPeriods("crop-water", "crop-water")
      .toPromise()
      .then((periods) => {
        this.availableRuns = periods;
      });

    // force await 100ms in order to show spinner
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!this.selectedPeriod) {
      // default to the last run
      data.period = this.availableRuns[0];
      this.selectedPeriod = data.period;
    } else {
      data.period = this.selectedPeriod;
    }

    console.log("apply filter", this.filter);
    const selectedArea = ADMINISTRATIVE_AREAS.find((x) => x.code === data.area);
    this.zoom = selectedArea.zLevel ? selectedArea.zLevel : this.zoom;
    this.center = selectedArea.coords;

    if (this.map) {
      // pan to current area
      this.map.setView(this.center, this.zoom);

      // remove the previous legend
      if (previousLayer && data.layer !== previousLayer) {
        this.map.removeControl(this.legends[previousLayer]);
      }

      // update ONLY on area and period
      const update =
        previousArea !== this.filter.area ||
        previousPeriod !== this.filter.period;
      // load layer on the map
      this.loadGeoData(update);

      // add the new legend
      this.legends[data.layer].addTo(this.map);

      // add attribution
      this.map.attributionControl.addAttribution("&copy; Highlander");
    }
  }

  /**
   * Load geo data on the map
   */
  loadGeoData(update: boolean = true) {
    // console.log(`loading geo data [update: ${update}]`);
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
    const datastore = `${
      this.filter.area
    }_monthlyForecast_${this.periodToString(this.filter.period)}`;

    // get geojson
    /*this.dataService.getGeoJson(datastore).subscribe(
      (geojson) => {
        console.log(geojson);
        this.geojson = geojson;
        this.renderOnMap();
        //L.geoJSON(geojson).addTo(this.map);
      },
      (error) => {
        console.log("error", error);
        this.notify.showError("Error to load data layer.");
        this.spinner.hide();
      }
    );*/

    // get zipped shapefile
    this.dataService.getZippedShapefile(datastore).subscribe(
      (data) => {
        const blob = new Blob([data], {
          type: "application/zip",
        });
        this.SHPtoGEOJSON(
          new File([blob], `${datastore}.zip`, {
            lastModified: new Date().getTime(),
            type: blob.type,
          }),
        );
      },
      (error) => {
        console.log("error", error);
        this.notify.showError("Error to load data layer.");
        this.spinner.hide();
      },
    );
  }

  printLayerDescription(): string {
    const code = this.filter.layer;
    const found = LAYERS.find((x) => x.code === code);
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

  private async SHPtoGEOJSON(file: File) {
    await this.dataService
      .readFileContent(file)
      .toPromise()
      .then((res) => {
        shp(res)
          .then((geojson) => {
            // console.log(geojson);
            this.geojson = geojson;
            this.renderOnMap();
          })
          .catch((err) => {
            console.error(err);
            this.notify.showError("Error in displaying data on the map");
            this.spinner.hide();
          });
      });
  }

  private getColorIndex(num: number, legend: LegendConfig): string {
    let layer = this.filter.layer;
    if (layer !== "crop") {
      for (const [idx, val] of legend.labels.entries()) {
        const min_max: number[] = val
          .split("-", 2)
          .map((num) => parseInt(num, 10));
        if (num >= min_max[0] && num <= min_max[1]) {
          return legend.colors[idx];
        }
      }
      throw `No color index found: number ${num} - layer<${layer}>`;
    } else {
      const idx = legend.ids.indexOf(num);
      if (idx !== -1) {
        return legend.colors[idx];
      }
    }
    // shouldn't be reached
    throw `No color index found: layer<${layer}>`;
  }

  private static getIndicatorValue(
    props: CropInfo,
    filter: CropWaterFilter,
  ): number {
    let indicator = filter.layer;
    // fix indicator id to match value from shapefile
    if (indicator === "prp") {
      indicator = "prec";
    }
    const percentile: string = filter.percentile
      ? String(filter.percentile).padStart(2, "0")
      : "";
    return indicator !== "crop"
      ? props[`${indicator}_${percentile}`]
      : props[`${indicator}`];
  }

  private renderOnMap() {
    const legend: LegendConfig = LEGEND_DATA.find(
      (x) => x.id === this.filter.layer,
    );
    const comp: CropWaterComponent = this;
    const jsonLayer = L.geoJSON(this.geojson, {
      style: (feature) => {
        let style = NORMAL_STYLE;
        const props = feature.properties as CropInfo;
        const num = CropWaterComponent.getIndicatorValue(props, comp.filter);
        if (isNaN(num)) {
          return NULL_STYLE;
        }
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
    // need to trigger resize event
    window.dispatchEvent(new Event("resize"));
  }
}
