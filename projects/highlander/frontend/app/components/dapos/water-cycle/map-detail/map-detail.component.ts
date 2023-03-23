import { Component, Input, OnChanges, ChangeDetectorRef } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { DetailService } from "../services/detail.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { VARIABLES, DROUGHTS, ACCUMULATIONS, BASINS, DATASETS } from "../data";
import { DataService } from "../../../../services/data.service";
import * as L from "leaflet";

import { ChartData } from "../../../../types";
import { LEGEND_DATA } from "../../../../services/data";
import { TIMERANGES } from "../../land-suitability-for-vegetation/data";

const MAX_ZOOM = 15;
const MIN_ZOOM = 8;

const JSON_STYLE = {
  weight: 2,
  opacity: 0.9,
  color: "gray",
  fillOpacity: 0,
};

@Component({
  selector: "water-cycle-map-detail",
  templateUrl: "./map-detail.component.html",
  styleUrls: ["./map-detail.component.scss"],
})
export class MapDetailComponent implements OnChanges {
  @Input() cropDetails;
  @Input() isPanelCollapsed;
  @Input() areaBounds;
  @Input() areaCenter;
  @Input() isHydro;

  basin: string;
  variableLabel: string;
  droughtLabel: string;
  accumulationLabel: string;
  yLabel: string;
  map: L.Map;
  mapsUrl: string;
  bounds = new L.LatLngBounds(new L.LatLng(30, -20), new L.LatLng(55, 40));
  LAYER_OSM = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Open Street Map</a>',
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    },
  );
  layers: L.Layer[] = [this.LAYER_OSM];
  layersControl = {
    baseLayers: {},
    overlays: null,
  };
  layersControlOptions = {
    collapsed: true,
  };
  mLayers = L.layerGroup([]);
  layerControlElement: HTMLElement[];

  options = {
    zoomControl: false,
    attributionControl: false,
    layers: [this.LAYER_OSM],
    zoom: 6,
    fullscreenControl: true,
    center: L.latLng([42.0, 13.0]),
    timeDimension: false,
    timeDimensionControl: false,
    //maxBounds: this.bounds,
    maxBoundsViscosity: 1.0,
    //bounds:
    timeDimensionControlOptions: {
      autoPlay: false,
      loopButton: true,
      timeSteps: 1,
      playReverseButton: true,
      limitSliders: true,
      playerOptions: {
        buffer: 0,
        transitionTime: 500,
        loop: true,
      },
    },
  };

  dataLoaded = false;
  chartData: ChartData[];
  // chart options
  colorScheme = {
    domain: ["rgba(16,80,122,0.98)", "#1a7dc1", "#aae3f5"],
  };

  private jsonBasins: L.LayerGroup = new L.LayerGroup();

  constructor(
    private detailService: DetailService,
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {
    this.mapsUrl = dataService.getMapsUrl();
  }

  onMapReady(map: L.Map) {
    this.map = map;
    setTimeout(function () {
      map.invalidateSize();
    }, 200);
  }
  onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
  }

  private setOverlaysToMap() {
    let overlays = {};
    // reset the zoom
    this.map.options.minZoom = MIN_ZOOM;
    this.map.options.maxZoom = MAX_ZOOM;

    // the max bounds are not fully necessary if pan is disabled by hand
    //this.map.setMaxBounds(this.areaBounds);

    // get the zoom according to the dimension of the bounding box
    // bug: this doesn't work if before the map is not displayed(ex from hydrological to meteorological selection)
    //let mapZoom = this.map.getBoundsZoom(this.areaBounds)
    let mapZoom = BASINS.find((x) => x.code === this.basin).zoom;
    // set the zoom (disabled: it cause problems in getting the area center
    //this.map.setZoom(mapZoom)

    setTimeout(() => {
      // simulate a static map disabling panning and zoom
      this.map.dragging.disable();
      this.map.options.minZoom = mapZoom;
      this.map.options.maxZoom = mapZoom;
      // set the map view according to the bounding box and its center
      this.map.fitBounds(this.areaBounds);
      // set the limit of the maps to the bounding box --> no longer useful if pan is disabled
      //this.map.setMaxBounds(this.areaBounds);
      this.map.invalidateSize();
    }, 100);

    // get the style
    let style = null;
    if (this.cropDetails.variable == "m" || this.cropDetails.variable == "i") {
      style = `highlander:water_sustainability_mm_im_${this.basin}`;
    } else {
      style = `highlander:water_sustainability_${this.cropDetails.variable}m_${this.basin}`;
    }

    // get the overlays
    if (!this.isHydro) {
      const url = `${this.mapsUrl}/wms`;
      overlays[`cropped`] = L.tileLayer.wms(url, {
        layers: `highlander:${this.cropDetails.dataset}_MD_${this.cropDetails.variable}m_${this.cropDetails.accumulation}`,
        version: "1.1.0",
        format: "image/png",
        opacity: 0.8,
        transparent: true,
        attribution: "&copy; Highlander",
        styles: style,
        maxZoom: MAX_ZOOM,
        minZoom: MIN_ZOOM,
      });
      this.layersControl["baseLayers"] = overlays;
      overlays[`cropped`].addTo(this.map);

      // remove the previous json layer
      this.jsonBasins.clearLayers();
      // add the json layer
      this.dataService.getGeojsonLayer(this.basin).subscribe((json) => {
        const jsonLayer = L.geoJSON(json, {
          style: JSON_STYLE,
        });
        this.jsonBasins.addLayer(jsonLayer);
        this.jsonBasins.addTo(this.map);
      });
    }
  }

  ngOnChanges() {
    if (!this.isPanelCollapsed) {
      setTimeout(() => {
        this.spinner.show();
      }, 0);
      console.log("get details for:", this.cropDetails);
      //add the label to be display in the panel
      this.droughtLabel = DROUGHTS.find(
        (x) => x.code == this.cropDetails.drought,
      ).label;

      this.variableLabel = VARIABLES.find(
        (x) => x.code == this.cropDetails.variable,
      ).label;

      this.basin = BASINS.find(
        (x) => x.label === this.cropDetails.area_id,
      ).code;

      if (this.cropDetails.drought === "h") {
        // there's only an accumulation period for hydrological drought
        this.accumulationLabel = "3 months";
      } else {
        this.accumulationLabel = ACCUMULATIONS.find(
          (x) => x.code == this.cropDetails.accumulation,
        ).label;
      }

      if (!this.isHydro) {
        this.map.invalidateSize();
        // remove the previous data
        let overlays = this.layersControl["baseLayers"];
        for (let name in overlays) {
          if (this.map.hasLayer(overlays[name])) {
            this.map.removeLayer(overlays[name]);
          }
        }
        this.setOverlaysToMap();
      }

      // get the data for the chart
      const filename = `${this.cropDetails.drought.toUpperCase()}D_${
        this.basin
      }`;
      this.detailService
        .getJsonData(filename)
        .subscribe(
          (response) => {
            //let data = response.data;
            let filteredData = [];
            let accumulationCode = this.isHydro
              ? `SSI-3`
              : `SPI_${this.cropDetails.accumulation}`;
            //console.log(response)
            DATASETS.forEach((dataset) => {
              let datasetData = {};
              // key to filter by dataset and accumulation
              const responseDatasetKey = `${dataset.code}_${accumulationCode}`;
              if (!response[responseDatasetKey]) {
                return;
              }
              //key to filter by variable
              const responseDataKey: string = Object.keys(
                response[responseDatasetKey],
              ).find((k) =>
                k.includes(
                  `${this.cropDetails.variable.toUpperCase()}${
                    this.cropDetails.drought
                  }`,
                ),
              );
              //console.log(responseDataKey)
              //console.log(`${this.cropDetails.variable.toUpperCase()}${this.cropDetails.drought}`)
              this.yLabel = responseDataKey;
              if (!response[responseDatasetKey][responseDataKey]) {
                return;
              }
              datasetData[dataset.code] =
                response[responseDatasetKey][responseDataKey];
              filteredData.push(datasetData);
            });

            this.chartData = this.normalizeData(filteredData);
          },
          (error) => {
            this.dataLoaded = false;
            this.notify.showError(error);
          },
        )
        .add(() => {
          this.spinner.hide();
          this.cdr.detectChanges();
        });
    }
  }

  xAxisTickFormat(val) {
    // the result is correct but it seems not to be applied by the chart
    return val
      .split(" ")
      .map((i) => `${i} \n`)
      .join("");
  }

  normalizeData(data) {
    //console.log(data)
    if (!data) {
      this.dataLoaded = false;
      this.notify.showWarning(
        "No results found. Try applying a different filter.",
      );
      return;
    }
    let normalizedData = [];

    data.forEach((d) => {
      let singleData = {};
      let dataName = Object.keys(d)[0];
      singleData["name"] = DATASETS.find((x) => x.code === dataName).label;
      singleData["value"] = d[dataName].toFixed(1);
      //console.log(singleData)
      normalizedData.push(singleData);
    });
    this.dataLoaded = true;
    return normalizedData;
  }
}
