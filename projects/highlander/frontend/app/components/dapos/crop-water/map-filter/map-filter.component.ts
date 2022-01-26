import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AuthService } from "@rapydo/services/auth";
import { ADMINISTRATIVE_AREAS, LAYERS } from "../data";
import { CropWaterFilter } from "../../../../types";

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
  readonly layers: string[] = LAYERS.map((x) => x.code);

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.filterForm = this.fb.group({
      layer: [LAYERS[0].code],
      area: [ADMINISTRATIVE_AREAS[0].code],
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
      this.onFilterChange.emit(val);
    });
  }
}
