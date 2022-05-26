import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AuthService } from "@rapydo/services/auth";
import { ADMINISTRATIVE_AREAS, LAYERS } from "../data";
import { CodeLabel, CropWaterFilter } from "../../../../types";

@Component({
  selector: "crop-water-filter",
  templateUrl: "./map-filter.component.html",
  styleUrls: ["./map-filter.component.scss"],
})
export class MapFilterComponent implements OnInit {
  filterForm: FormGroup;
  user;
  @Output() onFilterChange: EventEmitter<CropWaterFilter> =
    new EventEmitter<CropWaterFilter>();

  readonly crops = [];
  readonly areas = ADMINISTRATIVE_AREAS;
  readonly percentiles = [05, 25, 50, 75, 95];
  readonly layers: CodeLabel[] = LAYERS;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.filterForm = this.fb.group({
      layer: [LAYERS[0].code],
      area: [ADMINISTRATIVE_AREAS[0].code],
      percentile: [50],
    });
  }

  ngOnInit() {
    this.user = this.authService.getUser();
    // subscribe for form value changes
    this.onChanges();
    // apply filter the first time
    this.onFilterChange.emit(this.filterForm.value);
  }

  private onChanges(): void {
    this.filterForm.valueChanges.subscribe((val) => {
      if (val.layer == "crop") {
        delete val.percentile;
      }
      this.onFilterChange.emit(val);
    });
  }
}
