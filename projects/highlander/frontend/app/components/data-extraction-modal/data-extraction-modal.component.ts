import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  OnDestroy,
  ViewChild,
} from "@angular/core";
import { NgbActiveModal, NgbAlert } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from "../../services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import {
  DatasetInfo,
  ProductInfo,
  StorageUsage,
  Widget,
  SpatialArea,
  SpatialPoint,
} from "../../types";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
} from "@angular/forms";
import {
  forkJoin,
  throwError,
  of,
  iif,
  pipe,
  NEVER,
  ReplaySubject,
} from "rxjs";
import {
  startWith,
  switchMap,
  tap,
  takeUntil,
  catchError,
  delay,
} from "rxjs/operators";

@Component({
  selector: "data-extraction-modal",
  templateUrl: "./data-extraction-modal.component.html",
})
export class DataExtractionModalComponent implements OnInit, OnDestroy {
  @Input() dataset: DatasetInfo;
  @Input() productId: string;
  @Output() passEntry: EventEmitter<any> = new EventEmitter();

  productName: string;
  filterForm: FormGroup;
  productInfo: ProductInfo;
  estimatedSize: number;
  usage: StorageUsage;
  // the initial whole area
  initialArea: SpatialArea = {
    north: null,
    east: null,
    south: null,
    west: null,
  };
  remaining: number;
  private loading: boolean;
  private destroy$: ReplaySubject<boolean> = new ReplaySubject(1);

  @ViewChild("estimateAlert", { static: false }) estimateAlert: NgbAlert;
  estimateAlertAlertClosed = false;
  autoSizeEstimation = true;

  constructor(
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private fb: FormBuilder,
    private notify: NotificationService,
    private spinner: NgxSpinnerService,
  ) {}

  ngOnInit() {
    this.spinner.show("extSpinner");
    this.loading = true;
    forkJoin({
      storageUsage: this.dataService.getStorageUsage(),
      datasetProduct: this.dataService.getDatasetProduct(
        this.dataset.id,
        this.productId,
      ),
    })
      .pipe(
        catchError((err) => {
          this.activeModal.close();
          return throwError(err);
        }),
      )
      .subscribe(
        ({ storageUsage, datasetProduct }) => {
          this.usage = storageUsage;
          this.remaining = this.usage.quota - this.usage.used;
          this.productInfo = datasetProduct;
          this.productName = this.productInfo.label;
          this.filterForm = this.toFormGroup(datasetProduct);
          // check spatial coverage
          for (let widget of this.productInfo.widgets) {
            if (widget.name === "area") {
              for (let field of widget.details.fields) {
                if (field.name in this.initialArea) {
                  this.initialArea[field.name] = field.range;
                }
              }
              break;
            }
          }
          this.onFilterChange();
        },
        (error) => {
          this.notify.showError(error);
          this.spinner.hide("extSpinner");
          this.loading = false;
        },
      );
  }

  private estimateSize = () =>
    pipe(
      tap(() => {
        this.spinner.show("extSpinner");
        this.loading = true;
        this.estimatedSize = null;
      }),
      switchMap(() => {
        return this.dataService
          .getSizeEstimate(this.dataset.id, this.buildRequest())
          .pipe(
            // put catch error into inner observable in order
            // to keep outer observable live
            catchError((err) => {
              console.error(err);
              return of(null);
            }),
          );
      }),
      tap((size) => {
        if (size) {
          this.remaining = this.usage.quota - this.usage.used - size;
          this.estimatedSize = size;
        } else {
          this.notify.showWarning("Unable to calculate the size estimate.");
          // at this point the FormControl that caused the error should be unchecked?
        }
        this.spinner.hide("extSpinner");
        this.loading = false;
      }),
    );

  /**
   * Subscribe on filter change
   * @private
   */
  private onFilterChange() {
    this.filterForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        startWith(this.filterForm.value),
        switchMap((val) => (this.autoSizeEstimation ? of(val) : NEVER)),
        this.estimateSize(),
      )
      .subscribe((val) => {
        if (val) {
          this.estimatedSize = val;
        } else {
          this.estimatedSize = -1;
        }
      });
  }

  getWidget(widgetName: string): Widget {
    if (!this.productInfo) return;
    // @ts-ignore
    return this.productInfo.widgets.find((w) => w.name == widgetName);
  }

  onListChange(e, filter: string, type?: string) {
    const checkArray: FormArray = this.filterForm.get(filter) as FormArray;
    if (!checkArray) {
      console.warn(`filter '${filter}' not yet managed!`);
      return;
    }
    const val =
      type && type === "IntList" ? Number(e.target.value) : e.target.value;
    if (e.target.checked) {
      checkArray.push(new FormControl(val));
    } else {
      let i: number = 0;
      checkArray.controls.forEach((item: AbstractControl) => {
        if (item.value == val) {
          checkArray.removeAt(i);
          return;
        }
        i++;
      });
    }
  }

  submit() {
    iif(
      () => this.autoSizeEstimation,
      of(this.estimatedSize),
      of(true).pipe(
        this.estimateSize(),
        // show up estimate
        tap((val) => (this.estimateAlertAlertClosed = false)),
      ),
    ).subscribe((val) => {
      if (!this.estimatedSize) {
        // unable to calculate size estimation
        return;
      }
      if (this.remaining && this.remaining >= 0) {
        this.passEntry.emit(this.buildRequest());
        this.activeModal.close();
      } else if (!this.autoSizeEstimation) {
        // close alert after 5 secs
        setTimeout(() => this.estimateAlert.close(), 5000);
      }
    });
  }

  private buildRequest() {
    let res = {
      product_type: this.productId,
    };
    Object.keys(this.filterForm.controls).forEach((key) => {
      let controlValue = this.filterForm.controls[key].value;
      // @ts-ignore
      if (!key.startsWith("time_") && controlValue && controlValue.length) {
        res[key] = controlValue;
      }
    });
    // add time model
    let years: string[] = (this.filterForm.controls.time_year as FormArray)
      .value;
    let months: string[] = (this.filterForm.controls.time_month as FormArray)
      .value;
    let days: string[] = (this.filterForm.controls.time_day as FormArray).value;
    let hours: string[] = (this.filterForm.controls.time_hour as FormArray)
      .value;
    if (years.length || months.length || days.length || hours.length) {
      let time = {};
      if (years.length) {
        time["year"] = years;
      }
      if (months.length) {
        time["month"] = months;
      }
      if (days.length) {
        time["day"] = days;
      }
      if (hours.length) {
        time["hour"] = hours;
      }
      res["time"] = time;
    }
    // add spatial coverage
    let area: SpatialArea = (this.filterForm.controls.area as AbstractControl)
      .value;
    if (area) {
      res["area"] = area;
    }
    let location: SpatialPoint = (
      this.filterForm.controls.point as AbstractControl
    ).value;
    if (location) {
      res["location"] = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
    }
    return res;
  }

  setSpatialCoverage(area: SpatialArea) {
    console.log("set spatial coverage", area);
    this.filterForm.controls.point.setValue(null, {
      onlySelf: true,
      emitEvent: false,
    });
    this.filterForm.controls.area.setValue(area);
  }

  setLocationCoverage(loc: SpatialPoint) {
    console.log("set location coverage", loc);
    this.filterForm.controls.area.setValue(null, {
      onlySelf: true,
      emitEvent: false,
    });
    this.filterForm.controls.point.setValue(loc);
  }

  private toFormGroup(data: ProductInfo) {
    let formGroup = this.fb.group({
      time_year: this.fb.array([]),
      time_month: this.fb.array([]),
      time_day: this.fb.array([]),
      time_hour: this.fb.array([]),
      format: ["netcdf", Validators.required],
      area: [null],
      point: [null],
    });
    data.widgets_order.forEach((w) => {
      let comp = this.getWidget(w);
      if (comp.type === "StringList") {
        formGroup.addControl(comp.name as any, new FormArray([]));
      } else if (
        comp.type === "ExclusiveFrame" &&
        !["temporal_coverage", "spatial_coverage"].includes(comp.name)
      ) {
        formGroup.addControl(comp.name as any, new FormArray([]));
      }
    });
    return formGroup;
  }

  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Sort list of object alphabetically by field.
   * If the fields all end with a number, sort by that number.
   * E.g. R1,R2,...,R9,R10,R11,etc
   */
  sortBy(arr: any[], field: string) {
    if (!arr || arr.length === 0 || !arr[0].hasOwnProperty(field)) {
      return arr;
    }
    return arr.sort((a, b) => {
      let a1 = a[field].toLowerCase(),
        b1 = b[field].toLowerCase();
      const regex = /\d+$/;
      if (a1.match(regex) && b1.match(regex)) {
        const firstPartA = a1.replace(regex, ""),
          firstPartB = a1.replace(regex, "");
        if (firstPartA === firstPartB) {
          const an = Number(a1.match(regex)[0]),
            bn = Number(b1.match(regex)[0]);
          // compare numbers
          return an > bn ? 1 : an === bn ? 0 : -1;
        }
      }
      return a1.localeCompare(b1);
    });
  }

  toggleAutoSizeEstimation() {
    // console.log(`Auto size estimation ${this.autoSizeEstimation ? 'enabled' : 'disabled'}`);
    this.autoSizeEstimation = !this.autoSizeEstimation;
    if (this.autoSizeEstimation) {
      this.estimateAlertAlertClosed = false;
      // launch size estimation on re-activation
      this.filterForm.updateValueAndValidity({
        onlySelf: false,
        emitEvent: true,
      });
    } else {
      this.estimateAlert.close();
    }
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
