import { Component, Input, Output, EventEmitter } from "@angular/core";
import * as L from "leaflet";
import "leaflet-draw";
import * as _ from "lodash";

import { SpatialArea, SpatialPoint } from "../../../types";
import { NotificationService } from "@rapydo/services/notification";

const MAP_CENTER: L.LatLng = L.latLng({ lat: 41.88, lng: 12.28 });
// Disable all drawing options. ONLY edit layer allowed.
const DRAW_OPTIONS: L.Control.DrawOptions = {
  marker: false,
  polygon: false,
  circlemarker: false,
  circle: false,
  polyline: false,
  rectangle: false,
};
const MARKER_OPTIONS = {
  icon: L.icon({
    ...L.Icon.Default.prototype.options,
    iconUrl: "app/custom/assets/images/marker-icon.png",
    iconRetinaUrl: "app/custom/assets/images/marker-icon-2x.png",
    shadowUrl: "app/custom/assets/images/marker-shadow.png",
  }),
};

@Component({
  selector: "app-spatial-coverage",
  templateUrl: "./spatial-coverage.component.html",
  styleUrls: ["./spatial-coverage.component.scss"],
})
export class SpatialCoverageComponent {
  @Input() area: SpatialArea;
  selectedArea: SpatialArea;
  editableArea: SpatialArea;
  selectedLocation: SpatialPoint;
  editableLocation: SpatialPoint;
  @Output() areaChanged: EventEmitter<SpatialArea> =
    new EventEmitter<SpatialArea>();
  @Output() locationChanged: EventEmitter<SpatialPoint> =
    new EventEmitter<SpatialPoint>();
  private _editable: boolean = false;

  @Input() set editable(value: boolean) {
    this._editable = value;
  }

  get editable(): boolean {
    return this._editable;
  }

  drawnItems: L.FeatureGroup = L.featureGroup();
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

  // toolbar
  drawOptions: L.Control.DrawConstructorOptions = {
    position: "topright",
    draw: DRAW_OPTIONS,
    edit: {
      featureGroup: this.drawnItems,
      remove: false,
    },
  };

  constructor(private notify: NotificationService) {}

  onMapReady(map: L.Map) {
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

  private resetAll() {
    this.drawnItems.clearAllEventListeners();
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

  resizeDraw(e: L.DrawEvents.EditResize) {
    // console.log('resize area', e);
    this.updateEditableArea(e.layer);
  }

  moveDraw(e: L.DrawEvents.EditMove) {
    // console.log('move draw', e);
    if (e.layer instanceof L.Marker) {
      this.updateEditableLocation(e.layer);
    } else if (e.layer instanceof L.Rectangle) {
      this.updateEditableArea(e.layer);
    }
  }

  private updateEditableArea(layer: L.Layer) {
    if (!layer) return;
    const coords = (layer as L.Rectangle).getLatLngs();
    this.editableArea = {
      south: coords[0][0].lat,
      west: coords[0][0].lng,
      north: coords[0][2].lat,
      east: coords[0][2].lng,
    };
  }

  private updateEditableLocation(layer: L.Marker) {
    if (!layer) return;
    const point = layer.getLatLng();
    this.editableLocation = {
      latitude: point.lat,
      longitude: point.lng,
    };
  }

  private updateSelectedArea(layer: L.Rectangle) {
    const coords = layer.getLatLngs();
    this.selectedArea = {
      south: coords[0][0].lat,
      west: coords[0][0].lng,
      north: coords[0][2].lat,
      east: coords[0][2].lng,
    };
  }

  private updateSelectedLocation(layer: L.Marker) {
    if (!layer) return;
    const point = layer.getLatLng();
    this.selectedLocation = {
      latitude: point.lat,
      longitude: point.lng,
    };
  }

  onDrawEdited(e: L.DrawEvents.Edited) {
    // console.log('draw edited: save button');
    this.drawnItems.eachLayer((layer) => {
      if (layer instanceof L.Rectangle) {
        this.selectedArea = { ...this.editableArea };
        this.areaChanged.emit(this.selectedArea);
      } else if (layer instanceof L.Marker) {
        this.selectedLocation = { ...this.editableLocation };
        this.locationChanged.emit(this.selectedLocation);
      }
    });
  }

  onDrawEditStop(e: L.DrawEvents.EditStop) {
    // console.log('draw edit stop', e);
    this.editable = false;

    // reset to the actual selected area (ON EDIT CANCEL)
    // detect 'Cancel' when editable and selected areas are different
    if (this.editableArea && !_.isEqual(this.selectedArea, this.editableArea)) {
      this.updateArea(this.selectedArea, false);
      this.editableArea = { ...this.selectedArea };
    } else if (
      this.editableLocation &&
      !_.isEqual(this.selectedLocation, this.editableLocation)
    ) {
      this.updateLocation(this.selectedLocation);
      this.editableLocation = { ...this.selectedLocation };
    }
  }

  /**
   * Draw entire area
   * @private
   */
  private drawEntireArea() {
    // create the entire rectangle area
    if (Object.values(this.area).some((v) => v === null)) {
      console.error("Bad area", this.area);
      this.notify.showError(
        "The area CANNOT be drawn on the map as the coords are invalid",
      );
      return;
    }
    const poly = new L.Rectangle(
      L.latLngBounds(
        L.latLng(this.area.south, this.area.east),
        L.latLng(this.area.north, this.area.west),
      ),
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
    this.editableArea = { ...this.selectedArea };
  }

  /**
   * Draw updated area on the map.
   * @param val the new area to draw
   * @param propagate if true, propagate set spatial coverage and size estimate
   */
  updateArea(val: SpatialArea, propagate = true) {
    // console.log(`Draw updated area on the map. Propagate? ${propagate}`);
    // clean up
    this.resetAll();

    // create the updated rectangle area
    const poly = new L.Rectangle(
      L.latLngBounds(
        L.latLng(val.south, val.east),
        L.latLng(val.north, val.west),
      ),
    );

    // add to the map
    this.drawnItems.addLayer(poly);

    this.editableArea = {
      north: val.north,
      east: val.east,
      south: val.south,
      west: val.west,
    };

    if (propagate) {
      // update selected area
      this.selectedArea = { ...this.editableArea };
      // emit output changes
      this.areaChanged.emit(val);
    }
  }

  /**
   * Draw updated location on the map.
   * @param loc the new Location to draw
   */
  updateLocation(loc: SpatialPoint) {
    // console.log(`Draw updated location on the map: <${loc.latitude}, ${loc.longitude}>`);

    this.drawnItems.eachLayer((l: L.Layer) => {
      if (l instanceof L.Marker) {
        l.setLatLng(new L.LatLng(loc.latitude, loc.longitude));
      } else if (l instanceof L.Rectangle) {
        this.resetAll();
        // create the updated marker location
        const marker = L.marker([loc.latitude, loc.longitude], MARKER_OPTIONS);

        // add to the map
        this.drawnItems.addLayer(marker);
        this.updateSelectedLocation(marker);

        this.locationChanged.emit(this.selectedLocation);
      }
    });
  }
}
