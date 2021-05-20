import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from "../../services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import { Dataset } from "../../types";

@Component({
  selector: "data-extraction-modal",
  templateUrl: "./data-extraction-modal.component.html",
})
export class DataExtractionModalComponent implements OnInit {
  @Input() dataset: Dataset;
  @Output() passEntry: EventEmitter<any> = new EventEmitter();

  variables: any[];
  productName: string;

  constructor(
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private notify: NotificationService
  ) {}

  ngOnInit() {
    let [key, value] = Object.entries(this.dataset.products)[0];
    this.productName = key;
    this.variables = value[0].variables;
  }

  submit() {
    this.passEntry.emit();
    this.activeModal.close();
  }
}
