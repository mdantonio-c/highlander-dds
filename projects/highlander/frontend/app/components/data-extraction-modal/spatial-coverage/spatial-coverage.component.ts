import { Component, Input } from "@angular/core";
import * as L from "leaflet";
// import { SpatialArea } from "../../../types";

@Component({
  selector: "app-spatial-coverage",
  templateUrl: "./spatial-coverage.component.html",
  styleUrls: ["./spatial-coverage.component.scss"],
})
export class SpatialCoverageComponent {
  @Input() north: number;
  @Input() east: number;
  @Input() south: number;
  @Input() west: number;

  drawnItems: L.FeatureGroup = L.featureGroup();
  readonly offset: number = 1.2;
  map: L.Map;

  options = {
    layers: [
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "Open Street Map",
      }),
    ],
    zoomControl: true,
    zoom: 6,
    center: L.latLng({ lat: 41.879966, lng: 12.28 + this.offset }),
  };

  drawOptions = {
    position: "topright",
    draw: {
      polygon: false,
      circlemarker: false,
      circle: false,
      marker: false,
      polyline: false,
      // "showArea:false" 	solves a leafler-draw bug. An alternative is to add
      // "noImplicitUseStrict": true
      // under the compilerOptions property in tsconfig.json and tsconfig.app.json
      rectangle: {
        showArea: false,
      },
    },
    edit: {
      featureGroup: this.drawnItems,
    },
  };

  onMapReady(map) {
    this.map = map;
    map.zoomControl.setPosition("topright");
    map.on(L.Draw.Event.DRAWSTART, (e) => {
      this.resetAll();
    });

    map.on(L.Draw.Event.DELETED, (e) => {
      this.resetAll();
    });

    // create the entire rectangle area
    const poly = new L.Rectangle(
      L.latLngBounds(
        L.latLng(this.south, this.east),
        L.latLng(this.north, this.west)
      )
    );
    // zoom the map to the rectangle bounds
    this.fitBounds(poly);
    // add to the map
    this.drawnItems.addLayer(poly);
  }

  private getRandomLatLng() {
    return [48.8 + 0.1 * Math.random(), 2.25 + 0.2 * Math.random()];
  }

  private clearAll() {
    this.drawnItems.clearLayers();
  }

  private resetAll() {
    this.drawnItems.clearLayers();
  }

  /**
   * Fit bounds to given area.
   * @param area
   * @private
   */
  private fitBounds(area: L.Rectangle) {
    const southWest = area.getLatLngs()[0] as L.LatLng,
      northEast = area.getLatLngs()[2] as L.LatLng,
      bounds = L.latLngBounds(southWest, northEast);
    this.map.fitBounds(bounds, { padding: [50, 50] });
    // map pan slightly to right
    const center: L.LatLng = this.map.getCenter();
    this.map.panTo([center.lat - this.offset, center.lng + this.offset]);
  }

  onDrawCreated(e: any) {
    const type = (e as L.DrawEvents.Created).layerType,
      layer = (e as L.DrawEvents.Created).layer;
    if (type === "rectangle") {
      const coords = (layer as L.Rectangle).getLatLngs();
      // this.ilonControl.setValue(coords[0][0].lng, { emitEvent: false });
      // this.ilatControl.setValue(coords[0][0].lat, { emitEvent: false });
      // this.flonControl.setValue(coords[0][2].lng, { emitEvent: false });
      // this.flatControl.setValue(coords[0][2].lat, { emitEvent: false });
      this.drawnItems.addLayer(layer);
    }
  }

  onDrawEdited(e: L.DrawEvents.Edited) {
    const ref = this;
    e.layers.eachLayer(function (layer, comp: SpatialCoverageComponent = ref) {
      if (layer instanceof L.Rectangle) {
        const coords = (layer as L.Rectangle).getLatLngs();
        // comp.ilonControl.setValue(coords[0][0].lng, { emitEvent: false });
        // comp.ilatControl.setValue(coords[0][0].lat, { emitEvent: false });
        // comp.flonControl.setValue(coords[0][2].lng, { emitEvent: false });
        // comp.flatControl.setValue(coords[0][2].lat, { emitEvent: false });
      }
    });
  }
}
