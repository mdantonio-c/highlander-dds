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
  @Input() initialArea: SpatialArea;

  @Output() onAreaChange: EventEmitter<SpatialArea> =
    new EventEmitter<SpatialArea>();
  @Output() onLocationChange: EventEmitter<SpatialPoint> =
    new EventEmitter<SpatialPoint>();

  spatialForm: FormGroup;

  constructor(private fb: FormBuilder) {}

  private _selectedArea: SpatialArea;

  @Input() set selectedArea(value: SpatialArea) {
    this._selectedArea = value;
    if (!this.spatialForm) return;
    // update area coords
    this.spatialForm.patchValue({
      north: value.north,
      east: value.east,
      south: value.south,
      west: value.west,
    });
  }

  get selectedArea(): SpatialArea {
    return this._selectedArea;
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
    this.spatialForm.valueChanges.pipe(debounceTime(500)).subscribe((val) => {
      if (this.spatialForm.get("coverageType").value === "area") {
        // console.log('Emit area change');
        let newArea: SpatialArea = {
          north: this.spatialForm.get("north").value,
          east: this.spatialForm.get("east").value,
          south: this.spatialForm.get("south").value,
          west: this.spatialForm.get("west").value,
        };
        this.onAreaChange.emit(newArea);
      } else if (this.spatialForm.get("coverageType").value === "location") {
        // console.log('Emit location change');
        let newLocation: SpatialPoint = {
          lat: this.spatialForm.get("lat").value,
          lon: this.spatialForm.get("lon").value,
        };
        this.onLocationChange.emit(newLocation);
      }
    });
  }

  resetArea() {
    this.spatialForm.patchValue({
      north: this.initialArea.north,
      east: this.initialArea.east,
      south: this.initialArea.south,
      west: this.initialArea.west,
    });
  }

  @HostListener("dblclick", ["$event"])
  @HostListener("click", ["$event"])
  @HostListener("mousedown", ["$event"])
  @HostListener("wheel", ["$event"])
  public onClick(event: any): void {
    event.stopPropagation();
  }
}
