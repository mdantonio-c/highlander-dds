import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from "../../services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import { Dataset, DatasetVariables } from "../../types";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
} from "@angular/forms";

@Component({
  selector: "data-extraction-modal",
  templateUrl: "./data-extraction-modal.component.html",
})
export class DataExtractionModalComponent implements OnInit {
  @Input() dataset: Dataset;
  @Output() passEntry: EventEmitter<any> = new EventEmitter();

  variables: DatasetVariables;
  productName: string;
  filterForm: FormGroup;

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
    let [key, value] = Object.entries(this.dataset.products)[0];
    this.productName = key;
    this.variables = value[0].variables;
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
      product: this.productName,
      variables: (this.filterForm.controls.variables as FormArray).value,
    };
    this.passEntry.emit(res);
    this.activeModal.close();
  }
}
