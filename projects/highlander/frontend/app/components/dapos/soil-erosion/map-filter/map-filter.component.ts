import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AuthService } from "@rapydo/services/auth";
import { ADMINISTRATIVE_AREAS, INDICATORS } from "../data";

@Component({
  selector: "hl-map-filter",
  templateUrl: "./map-filter.component.html",
  styleUrls: ["./map-filter.component.scss"],
})
export class MapFilterComponent implements OnInit {
  filterForm: FormGroup;
  user;
  @Output() onFilterChange: EventEmitter<null> = new EventEmitter<null>();

  readonly indicators = INDICATORS;
  readonly administratives = ADMINISTRATIVE_AREAS;
  readonly physicals = [];
  readonly userSelectedItems = [];

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.filterForm = this.fb.group({
      indicator: ["RF"],
      administrative: ["italy"],
      physical: [""],
      userSelected: [""],
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
