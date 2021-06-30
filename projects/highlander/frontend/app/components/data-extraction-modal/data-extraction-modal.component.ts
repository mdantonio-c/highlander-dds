import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from "../../services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import {
  DatasetInfo,
  DatasetVariables,
  ProductInfo,
  Widget,
} from "../../types";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
} from "@angular/forms";

@Component({
  selector: "data-extraction-modal",
  templateUrl: "./data-extraction-modal.component.html",
})
export class DataExtractionModalComponent implements OnInit {
  @Input() dataset: DatasetInfo;
  @Input() productId: string;
  @Output() passEntry: EventEmitter<any> = new EventEmitter();

  productName: string;
  filterForm: FormGroup;
  productInfo: ProductInfo;

  constructor(
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private fb: FormBuilder,
    private notify: NotificationService
  ) {
    this.filterForm = this.fb.group({
      variables: this.fb.array([]),
    });
  }

  ngOnInit() {
    console.log(`Product ID: ${this.productId}`);
    console.log(this.dataset);
    this.dataService
      .getDatasetProduct(this.dataset.id, this.productId)
      .subscribe(
        (data) => {
          this.productInfo = data;
          this.productName = this.productInfo.label;
        },
        (error) => {
          this.notify.showError(error);
        }
      );
  }

  getWidget(widgetName: string): Widget {
    if (!this.productInfo) return;
    return this.productInfo.widgets.find((w) => w.name == widgetName);
  }

  onVariablesChange(e) {
    const checkArray: FormArray = this.filterForm.get("variables") as FormArray;

    if (e.target.checked) {
      checkArray.push(new FormControl(e.target.value));
    } else {
      let i: number = 0;
      checkArray.controls.forEach((item: AbstractControl) => {
        if (item.value == e.target.value) {
          checkArray.removeAt(i);
          return;
        }
        i++;
      });
    }
  }

  submit() {
    const res = {
      product: this.productId,
      variables: (this.filterForm.controls.variables as FormArray).value,
    };
    this.passEntry.emit(res);
    this.activeModal.close();
  }
}
