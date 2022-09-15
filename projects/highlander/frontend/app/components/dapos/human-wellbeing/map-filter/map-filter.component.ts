import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { NgbDateStruct } from "@ng-bootstrap/ng-bootstrap";
import { AuthService } from "@rapydo/services/auth";
import { NotificationService } from "@rapydo/services/notification";
import {
  ADMINISTRATIVE_AREAS,
  INDICATORS,
  DAILY_METRICS,
  TIME_PERIODS,
} from "../data";

@Component({
  selector: "human-wellbeing-filter",
  templateUrl: "./map-filter.component.html",
  styleUrls: ["./map-filter.component.scss"],
})
export class MapFilterComponent implements OnInit {
  filterForm: FormGroup;
  user;
  @Output() onFilterChange: EventEmitter<null> = new EventEmitter<null>();

  readonly indicators = INDICATORS;
  readonly administratives = ADMINISTRATIVE_AREAS;
  readonly landUseBased = [];
  readonly userSelectedItems = [];
  readonly dailyMetrics = DAILY_METRICS;
  readonly timePeriods = TIME_PERIODS;
  readonly day = [];

  maxDate: NgbDateStruct = {
    year: 2020,
    month: 12,
    day: 31,
  };

  minDate: NgbDateStruct = {
    year: 1989,
    month: 1,
    day: 1,
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notify: NotificationService
  ) {
    this.filterForm = this.fb.group({
      indicator: ["WC"],
      administrative: ["italy"],
      landUseBased: [""],
      userSelected: [""],
      daily_metric: ["daymax"],
      timePeriod: ["multi-year"],
      day: [""],
    });
  }

  ngOnInit() {
    this.user = this.authService.getUser();
    // subscribe for form value changes
    this.onChanges();
    // apply filter the first time
    setTimeout(() => {
      this.onFilterChange.emit(this.filterForm.value);
    }, 1000);
  }

  private onChanges(): void {
    this.filterForm.valueChanges.subscribe((val) => {
      if (
        this.filterForm.get("timePeriod").value === "day" &&
        !this.filterForm.get("day").value
      ) {
        return;
      }
      if (this.filterForm.get("timePeriod").value === "multi-year") {
        this.filterForm.patchValue(
          {
            day: null,
          },
          { emitEvent: false, onlySelf: true }
        );
      }
      this.onFilterChange.emit(val);
    });
  }
}
