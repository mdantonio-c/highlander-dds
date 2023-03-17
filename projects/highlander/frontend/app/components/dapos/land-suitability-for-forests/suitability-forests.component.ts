import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectorRef,
  Input,
} from "@angular/core";
import { User } from "@rapydo/types";
import { AuthService } from "@rapydo/services/auth";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import {
  DatasetInfo,
  ForestSuitabilityFilter,
  ForestSuitabilityMapCrop,
  ProvinceFeature,
  RegionFeature,
  BasinFeature,
} from "../../../types";
import { environment } from "@rapydo/../environments/environment";
import { DataService } from "../../../services/data.service";
import { SSRService } from "@rapydo/services/ssr";
import {
  INDICATORS,
  BIOTEMPERATURES,
  BIOPRECIPITATIONS,
  SPECIES,
} from "./data";

import * as L from "leaflet";

const MAX_ZOOM = 8;
const MIN_ZOOM = 5;

const HIGHLIGHT_STYLE = {
  weight: 5,
  color: "#666",
  dashArray: "",
  fillOpacity: 0.7,
};
const NORMAL_STYLE = {
  weight: 2,
  opacity: 0.9,
  color: "gray",
  fillOpacity: 0,
};
const SELECT_STYLE = {
  weight: 5,
  color: "#466c91",
  dashArray: "",
  fillOpacity: 0.7,
  zIndex: 100,
};

@Component({
  selector: "app-suitability-forests",
  templateUrl: "./suitability-forests.component.html",
  styleUrls: ["./suitability-forests.component.scss"],
})
export class SuitabilityForestComponent implements OnInit {
  @Input()
  dataset: DatasetInfo;
  user: User;
  readonly backendURI = environment.backendURI;
  loading = false;
  isFilterCollapsed = false;
  private collapsed = false;
  map: L.Map;
  private legends: { [key: string]: L.Control } = {};
  mapsUrl: string;

  bounds = new L.LatLngBounds(new L.LatLng(30, -20), new L.LatLng(55, 40));
  readonly LEGEND_POSITION = "bottomleft";

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
  mLayers = L.layerGroup([]);

  options = {
    layers: [this.LAYER_OSM],
    zoom: 6,
    fullscreenControl: true,
    center: L.latLng([42.0, 13.0]),
    timeDimension: false,
    timeDimensionControl: false,
    // maxBounds: this.bounds,
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

  private administrativeArea: L.LayerGroup = new L.LayerGroup();
  private filter: ForestSuitabilityFilter;

  administrative: string;
  // currentModel: string;
  mapCropDetails: ForestSuitabilityMapCrop;
  isPanelCollapsed: boolean = true;
  selectedLayer;

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private ssr: SSRService,
    private cdr: ChangeDetectorRef,
  ) {
    this.mapCropDetails = {};
    this.mapsUrl = dataService.getMapsUrl();
    //console.log(`Map url: ${this.mapsUrl}`)
  }

  ngOnInit() {
    if (this.ssr.isBrowser) {
      this.setCollapse(window.innerWidth);
    }
    this.authService.isAuthenticated().subscribe((isAuth) => {
      this.user = isAuth ? this.authService.getUser() : null;
    });
  }

  onMapReady(map: L.Map) {
    this.map = map;
    setTimeout(function () {
      map.invalidateSize();
    }, 200);
  }

  private setOverlaysToMap() {
    let overlays = {};
    let layers = "";
    const period = this.filter.period;
    switch (this.filter.indicator) {
      case "FTY":
        layers = `highlander:Forest_Type`;
        break;
      case "BIOTEMP":
        const biotemperature = this.filter.bioclimaticTemperature;
        layers = `highlander:${biotemperature}_${period}`;
        break;
      case "BIOPRP":
        const bioprecipitation = this.filter.bioclimaticPrecipitation;
        layers = `highlander:${bioprecipitation}_${period}`;
        break;
      case "FOREST":
        const specie = this.filter.forestSpecie;
        layers = `highlander:${specie}_${period}`;
        break;
    }

    let url = `${this.mapsUrl}/wms`;

    overlays[layers] = L.tileLayer.wms(url, {
      layers: layers,
      version: "1.1.0",
      format: "image/png",
      opacity: 0.7,
      transparent: true,
      attribution: "&copy; Highlander",
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    });
    this.layersControl["baseLayers"] = overlays;
    overlays[layers].addTo(this.map);
    // add the legend
    this.addLegend(layers);
  }

  addLegend(layer: string) {
    this.dataService.getLegend(layer).subscribe(
      (response) => {
        const legendTitle = response["Legend"][0]["rules"][0]["title"];
        const legendContent =
          response["Legend"][0]["rules"][0]["symbolizers"][0]["Raster"][
            "colormap"
          ]["entries"];
        this.legends[this.filter.indicator] = this.createLegendControl(
          legendTitle,
          legendContent,
        );
        this.legends[this.filter.indicator].addTo(this.map);
        console.log(response["Legend"][0]);
        //console.log(legendContent)
      },
      (error) => {
        this.notify.showError(error);
      },
    );
  }

  private createLegendControl(title, content): L.Control {
    const legend = new L.Control({ position: this.LEGEND_POSITION });
    legend.onAdd = () => {
      let div = L.DomUtil.create("div", "legend_box");
      div.style.clear = "unset";
      //div.innerHTML += '<img src='+url+' alt="legend">';
      div.innerHTML += `<h6>${title}</h6>`;
      for (let i = 0; i < content.length; i++) {
        div.innerHTML +=
          '<i style="background:' +
          content[i]["color"] +
          '"></i><span>' +
          content[i]["label"] +
          "</span><br>";
      }
      return div;
    };
    return legend;
  }

  onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
  }

  applyFilter(data: ForestSuitabilityFilter) {
    console.log("apply filter", data);
    if (!this.filter) {
      this.filter = data;
      this.setOverlaysToMap();
    }

    // INDICATORS
    if (
      this.filter.indicator !== data.indicator ||
      this.filter.period !== data.period ||
      this.filter.bioclimaticTemperature !== data.bioclimaticTemperature ||
      this.filter.bioclimaticPrecipitation !== data.bioclimaticPrecipitation ||
      this.filter.forestSpecie !== data.forestSpecie
    ) {
      //console.log(`indicator changed to ${data.indicator}`);

      // remove the previous legend
      this.map.removeControl(this.legends[this.filter.indicator]);

      this.filter = data;

      // remove the previous layers
      let overlays = this.layersControl["baseLayers"];
      for (let name in overlays) {
        if (this.map.hasLayer(overlays[name])) {
          this.map.removeLayer(overlays[name]);
        }
      }

      this.setOverlaysToMap();
    }

    // ADMINISTRATIVE AREA
    this.administrative = data.administrative;
    // clear current administrative layer
    if (this.map) {
      this.administrativeArea.clearLayers();
    }
    // check if the administrative is italy or if it's forest type indicator (where cropping feature is not supported)
    if (data.administrative === "italy" || data.indicator == "FTY") {
      if (this.map) {
        this.map.setView(L.latLng([42.0, 13.0]), 6);
      }
      return;
    }
    this.dataService
      .getGeojsonLayer(`italy-${data.administrative}`)
      .subscribe((json) => {
        const jsonLayer = L.geoJSON(json, {
          style: NORMAL_STYLE,
          onEachFeature: (feature, layer) =>
            layer.on({
              mouseover: (e) => this.highlightFeature(e),
              mouseout: (e) => this.resetFeature(e),
              click: (e) => this.loadDetails(e),
            }),
        });
        this.administrativeArea.addLayer(jsonLayer);
        this.administrativeArea.addTo(this.map);
      });
    //if the detail panel is opened, close it
    this.closeDetails();

    // update the map crop details model
    // get the indicator
    let indicator_code = this.filter.indicator;
    const indicator = INDICATORS.find((x) => x.code == indicator_code);
    this.mapCropDetails.product = indicator.product;
    switch (indicator_code) {
      case "BIOTEMP":
        this.mapCropDetails.indicator = this.filter.bioclimaticTemperature;
        break;
      case "BIOPRP":
        this.mapCropDetails.indicator = this.filter.bioclimaticPrecipitation;
        break;
      case "FOREST":
        this.mapCropDetails.indicator = this.filter.forestSpecie;
        break;
    }

    this.mapCropDetails.period = this.filter.period;
    this.mapCropDetails.area_type = this.administrative;
    //force the ngonChanges of the child component
    this.mapCropDetails = Object.assign({}, this.mapCropDetails);
  }

  checkSelectedFeature(layer) {
    let layerName = layer.feature.properties.name;

    if (this.mapCropDetails && layerName) {
      if (this.mapCropDetails.area_id !== layerName) {
        return false;
      }
    } else {
      // no area has been selected
      return false;
    }
    return true;
  }

  private highlightFeature(e) {
    const layer = e.target;
    const isSelected = this.checkSelectedFeature(layer);
    if (!isSelected) {
      layer.setStyle(HIGHLIGHT_STYLE);
    }
  }

  private resetFeature(e) {
    const layer = e.target;
    const isSelected = this.checkSelectedFeature(layer);
    if (!isSelected) {
      layer.setStyle(NORMAL_STYLE);
    }
  }

  private loadDetails(e) {
    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
    const layer = e.target;
    if (this.selectedLayer) {
      // set the normal style to the previously selected layer
      this.selectedLayer.setStyle(NORMAL_STYLE);
    }
    const bounds = layer.getBounds();
    const layerCenter = bounds.getCenter();

    setTimeout(() => {
      this.map.setView(layerCenter);
    }, 1);

    switch (this.administrative) {
      case "regions":
        this.mapCropDetails.area_id = (
          layer.feature.properties as RegionFeature
        ).name;
        //console.log("region: "+this.mapCropDetails.area_id);
        break;
      case "provinces":
        this.mapCropDetails.area_id = (
          layer.feature.properties as ProvinceFeature
        ).name;
        //console.log("province: "+this.mapCropDetails.area_id);
        break;
      case "basins":
        this.mapCropDetails.area_id = (
          layer.feature.properties as BasinFeature
        ).name;
        break;
    }
    //force the ngonChanges of the child component
    this.mapCropDetails = Object.assign({}, this.mapCropDetails);
    this.isPanelCollapsed = false;

    // change the layer style
    layer.setStyle(SELECT_STYLE);
    // set the current selected layer
    setTimeout(() => {
      this.selectedLayer = layer;
    }, 0);
    this.cdr.detectChanges();
  }

  isCollapsed = true;

  closeDetails() {
    this.isPanelCollapsed = true;
    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
    setTimeout(() => {
      this.map.setView(L.latLng([42.0, 13.0]), 6);
    }, 1);
  }

  toggleCollapse() {
    this.isFilterCollapsed = !this.isFilterCollapsed;
  }

  private setCollapse(width: number) {
    if (width < 991.98) {
      if (!this.collapsed) {
        this.isFilterCollapsed = true;
        this.collapsed = true;
      }
    } else {
      this.isFilterCollapsed = false;
      this.collapsed = false;
    }
  }

  @HostListener("window:resize", ["$event"])
  onResize(event) {
    this.setCollapse(event.target.innerWidth);
  }
}
