import { Component, Input } from "@angular/core";
import * as L from "leaflet";
import { SpatialArea } from "../../../types";
// import { SpatialArea } from "../../../types";

const MAP_CENTER: L.LatLng = L.latLng({ lat: 41.88, lng: 12.28 });

@Component({
  selector: "app-spatial-coverage",
  templateUrl: "./spatial-coverage.component.html",
  styleUrls: ["./spatial-coverage.component.scss"],
})
export class SpatialCoverageComponent {
  @Input() area: SpatialArea;
  selectedArea: SpatialArea;

  drawnItems: L.FeatureGroup = L.featureGroup();
  readonly offset: number = 1.8;
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
    center: MAP_CENTER,
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

    this.drawEntireArea();
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
    this.map.fitBounds(bounds, { padding: [20, 20] });
  }

  onDrawCreated(e: any) {
    const type = (e as L.DrawEvents.Created).layerType,
      layer = (e as L.DrawEvents.Created).layer;
    if (type === "rectangle") {
      const coords = (layer as L.Rectangle).getLatLngs();
      console.log(coords);
      this.selectedArea = {
        south: coords[0][0].lat,
        west: coords[0][0].lng,
        north: coords[0][2].lat,
        east: coords[0][2].lng,
      };
      this.drawnItems.addLayer(layer);
    }
  }

  onDrawEdited(e: L.DrawEvents.Edited) {
    const ref = this;
    e.layers.eachLayer(function (layer, comp: SpatialCoverageComponent = ref) {
      if (layer instanceof L.Rectangle) {
        const coords = (layer as L.Rectangle).getLatLngs();
        comp.selectedArea = {
          south: coords[0][0].lat,
          west: coords[0][0].lng,
          north: coords[0][2].lat,
          east: coords[0][2].lng,
        };
      }
    });
  }

  onDrawDeleted(e: L.DrawEvents.Deleted) {
    // reset to the whole area
    this.drawEntireArea();
  }

  private drawEntireArea() {
    // create the entire rectangle area
    const poly = new L.Rectangle(
      L.latLngBounds(
        L.latLng(this.area.south, this.area.east),
        L.latLng(this.area.north, this.area.west)
      )
    );
    // zoom the map to the rectangle bounds
    this.fitBounds(poly);
    // add to the map
    this.drawnItems.addLayer(poly);
    // update selected area
    this.selectedArea = {
      north: this.area.north,
      east: this.area.east,
      south: this.area.south,
      west: this.area.west,
    };
  }

  updateArea(val: SpatialArea) {
    // clean up
    this.resetAll();
    // create the updated rectangle area
    const poly = new L.Rectangle(
      L.latLngBounds(
        L.latLng(val.south, val.east),
        L.latLng(val.north, val.west)
      )
    );
    // add to the map
    this.drawnItems.addLayer(poly);
  }
}
