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
  fillOpacity: 0.8
};
const HIGHLIGHT_STYLE = {
  weight: 1,
  color: "#ccc",
  fillOpacity: 0.7,
};
// FIXME
const WMS_ENDPOINT = "https://dds.highlander.cineca.it/geoserver/wms";

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
        '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Open Street Map</a> ',
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    }
  );
  options = {
    layers: [this.LAYER_OSM],
    zoom: this.zoom,
    fullscreenControl: true,
    center: this.center,
  };

  // layers: L.Layer[] = [this.LAYER_OSM];
  filter: CropWaterFilter;
  private geoData: L.LayerGroup = new L.LayerGroup();
  // private jsonLayer: L.GeoJSON;
  private geojson;
  // referenceDate: string = "2021-07-07";

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private modalService: NgbModal
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
    this.spinner.show()

    const previousLayer = this.filter?.layer || null;
    const previousPeriod = this.filter?.period || null;
    const previousArea = this.filter?.area || null;
    this.filter = data;

    // need to wait for the available runs to load
    await this.dataService
      .getRunPeriods("crop-water", "crop-water")
      .toPromise()
      .then((periods) => (this.availableRuns = periods));

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
      const update = previousArea !== this.filter.area || previousPeriod !== this.filter.period;
      // load layer on the map
      this.loadGeoData(update);

      // add the new legend
      this.legends[data.layer].addTo(this.map);
    }
  }

  /**
   * Load geo data on the map
   */
  loadGeoData(update: boolean = true) {
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

    // filename in form of: {area}_monthlyForecast_{YYYY-MM-DD}.zip
    const filename = `${this.filter.area}_monthlyForecast_${this.periodToString(
      this.filter.period
    )}.zip`;
    this.dataService.getShapefile(filename).subscribe(
        (data) => {
          const blob = new Blob([data], {
            type: 'application/zip'
          });
          this.SHPtoGEOJSON(
            new File([blob], filename, { lastModified: new Date().getTime(), type: blob.type }));
        },
        (error) => {
          console.log('error', error);
          this.notify.showError("Error to load data layer.");
          this.spinner.hide();
        }
    );
  }

  printLayerDescription(): string {
    const code = this.filter.layer;
    const found = LAYERS.find((x) => x.code === code);
    return found.label || code;
  }

  onPeriodChange(val) {
    console.log("period changed", val);
    this.filter.period = val;
    this.applyFilter(this.filter);
  }

  isSamePeriod(a: DateStruct, b: DateStruct) {
    return _.isEqual(a, b);
  }

  periodToString(p: DateStruct): string {
    return `${p.year}-${String(p.month).padStart(2, "0")}-${String(
      p.day
    ).padStart(2, "0")}`;
  }

  private async SHPtoGEOJSON(file: File) {
    await this.dataService.readFileContent(file)
      .toPromise().then(
        res => {
          shp(res).then((geojson) => {
            // console.log(geojson);
            this.geojson = geojson;
            this.renderOnMap();
          })
          .catch(err => {
            console.error(err)
            this.notify.showError("Error in displaying data on the map");
            this.spinner.hide();
          });
        }
      );
  }

  private renderOnMap() {
    const legend: LegendConfig = LEGEND_DATA.find((x) => x.id === this.filter.layer);
    const comp: CropWaterComponent = this;
    const startTime = new Date();
    const jsonLayer = L.geoJSON(this.geojson, {
     style: (feature) => {
       let style = NORMAL_STYLE;
       style.fillColor = comp.getColorIndex(feature.properties as CropInfo, legend);
       return style;
     },
     onEachFeature: (feature, layer) => {
       const fillColor = comp.getColorIndex(feature.properties as CropInfo, legend);
       layer.on({
         mouseover: (e) => this.highlightFeature(e),
         mouseout: (e) => this.resetFeature(e, fillColor),
         click: (e) => this.openDetails(e),
       })
     },
    });
    this.geoData.addLayer(jsonLayer);
    this.geoData.addTo(this.map);
    this.spinner.hide();
  }

  private getColorIndex(props: CropInfo, legend: LegendConfig): string {
    let layer = this.filter.layer;
    // fix layer id to match value from shapefile
    if (layer === 'prp') {
      layer = 'prec';
    }
    const percentile: string = this.filter.percentile
      ? String(this.filter.percentile).padStart(2, "0")
      : "";
    // console.log(`get color index for layer<${layer}>, percentile<${percentile}>`);
    if (layer !== 'crop') {
      for (const [idx, val] of legend.labels.entries()) {
        const min_max: number[] = val.split('-', 2).map(num => parseInt(num, 10));
        const num: number = props[`${layer}_${percentile}`];
        if (num >= min_max[0] && num <= min_max[1] ) {
          return legend.colors[idx];
        }
      }
    } else {
      const idx = legend.ids.indexOf(props[`${layer}`]);
      if (idx !== -1) {
        return legend.colors[idx];
      }
    }
    // shouldn't be reached
    throw `No color index found: layer<${layer}>`;
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

