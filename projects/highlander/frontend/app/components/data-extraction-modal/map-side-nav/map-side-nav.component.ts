import {
  Component,
  Input,
  OnInit,
  HostListener,
  Output,
  EventEmitter,
} from "@angular/core";
import { trigger, style, animate, transition } from "@angular/animations";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { SpatialArea, SpatialPoint } from "../../../types";
import { debounceTime } from "rxjs/operators";
import * as _ from "lodash";

@Component({
  selector: "app-map-side-nav",
  templateUrl: "./map-side-nav.component.html",
  styleUrls: ["./map-side-nav.component.scss"],
  animations: [
    trigger("openClose", [
      transition(":enter", [
        style({ opacity: 0 }),
        animate("500ms", style({ opacity: 1 })),
      ]),
      transition(":leave", [animate("0ms", style({ opacity: 0 }))]),
    ]),
  ],
})
export class MapSideNavComponent implements OnInit {
  @Input() readonly initialArea: SpatialArea;

  @Output() onAreaChange: EventEmitter<{
    area: SpatialArea;
    propagate: boolean;
  }> = new EventEmitter<{ area: SpatialArea; propagate: boolean }>();
  @Output() onLocationChange: EventEmitter<SpatialPoint> =
    new EventEmitter<SpatialPoint>();
  private _editable: boolean;

  @Input() set editable(value: boolean) {
    this._editable = value;
  }

  get editable(): boolean {
    return this._editable;
  }

  spatialForm: FormGroup;

  constructor(private fb: FormBuilder) {}

  private _selectedArea: SpatialArea;

  @Input() set selectedArea(value: SpatialArea) {
    this._selectedArea = value;
    if (!this.spatialForm) return;
    // update area coords
    this.spatialForm.patchValue(
      {
        north: value.north,
        east: value.east,
        south: value.south,
        west: value.west,
      },
      {
        onlySelf: true,
        emitEvent: false,
      },
    );
  }

  get selectedArea(): SpatialArea {
    return this._selectedArea;
  }

  private _selectedLocation: SpatialPoint;

  @Input() set selectedLocation(value: SpatialPoint) {
    this._selectedLocation = value;
    if (!this.spatialForm) return;
    // update location lat/lon
    this.spatialForm.patchValue(
      {
        lat: value.latitude,
        lon: value.longitude,
      },
      {
        onlySelf: true,
        emitEvent: false,
      },
    );
  }

  ngOnInit() {
    this.spatialForm = this.fb.group({
      north: [this.initialArea.north],
      east: [this.initialArea.east],
      south: [this.initialArea.south],
      west: [this.initialArea.west],
      lat: [""],
      lon: [""],
      coverageType: ["area", Validators.required],
    });

    this.onChanges();
  }

  onChanges(): void {
    this.spatialForm.valueChanges.pipe(debounceTime(100)).subscribe((val) => {
      if (this.spatialForm.get("coverageType").value === "area") {
        let newArea: SpatialArea = {
          north: this.spatialForm.get("north").value,
          east: this.spatialForm.get("east").value,
          south: this.spatialForm.get("south").value,
          west: this.spatialForm.get("west").value,
        };
        if (
          !newArea.north ||
          !newArea.south ||
          !newArea.east ||
          !newArea.west
        ) {
          // DO NOT emit invalid area
          return;
        }
        // console.log('Emit area change');
        this.onAreaChange.emit({
          area: newArea,
          propagate: false,
        });
      } else if (this.spatialForm.get("coverageType").value === "location") {
        let newLocation: SpatialPoint = {
          latitude: this.spatialForm.get("lat").value,
          longitude: this.spatialForm.get("lon").value,
        };
        if (!newLocation.latitude || !newLocation.longitude) {
          // set default in the middle
          newLocation.latitude =
            this.initialArea.north -
            (this.initialArea.north - this.initialArea.south) / 2;
          newLocation.longitude =
            this.initialArea.east -
            (this.initialArea.east - this.initialArea.west) / 2;
          this.selectedLocation = { ...newLocation };
        }
        // console.log("Emit location change");
        this.onLocationChange.emit(newLocation);
      }
    });
  }

  resetArea() {
    this.selectedArea = { ...this.initialArea };
    this.onAreaChange.emit({
      area: this.initialArea,
      propagate: true,
    });
  }

  isWholeAreaSelected(): boolean {
    return _.isEqual(this.initialArea, this.selectedArea);
  }

  @HostListener("dblclick", ["$event"])
  @HostListener("click", ["$event"])
  @HostListener("mousedown", ["$event"])
  @HostListener("wheel", ["$event"])
  public onClick(event: any): void {
    event.stopPropagation();
  }
}
