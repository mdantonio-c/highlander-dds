import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from "@angular/forms";
import { AuthService } from "@rapydo/services/auth";

@Component({
  selector: "hl-map-filter",
  templateUrl: "./map-filter.component.html",
  styleUrls: ["./map-filter.component.css"],
})
export class MapFilterComponent implements OnInit {
  filterForm: FormGroup;
  user;
  @Output() onFilterChange: EventEmitter<null> = new EventEmitter<null>();

  indicators = [
    {
      code: "RF",
      label: "R Factor",
    },
    {
      code: "SL",
      label: "Soil Loss",
    },
  ];

  administratives = [
    { code: "ADM1", label: "Italy" },
    { code: "ADM2", label: "Regions" },
    { code: "ADM3", label: "Provinces" },
    { code: "ADM4", label: "Municipalities" },
  ];
  physicals = [];
  userSelectedItems = [];

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.filterForm = this.fb.group({
      indicator: ["RF"],
      administrative: ["ADM1"],
      physical: [""],
      userSelected: [""],
    });
  }

  ngOnInit() {
    this.user = this.authService.getUser();
    // subscribe for form value changes
    this.onChanges();
    // apply filter the first time
    this.filter();
  }

  private onChanges(): void {
    // TODO
  }

  private filter() {
    let filter = this.filterForm.value;
    // TODO
    this.onFilterChange.emit(filter);
  }
}
