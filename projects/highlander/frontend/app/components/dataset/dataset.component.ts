import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Dataset } from "../../types";
import { NotificationService } from "@rapydo/services/notification";
import { DataService } from "../../services/data.service";
import { Observable } from "rxjs";

@Component({
  selector: "app-dataset",
  templateUrl: "./dataset.component.html",
})
export class DatasetComponent implements OnInit {
  dataset: Dataset;
  // dataset$: Observable<Dataset>;

  constructor(
    private dataService: DataService,
    public route: ActivatedRoute,
    private router: Router,
    private notify: NotificationService
  ) {
    this.dataset = this.router.getCurrentNavigation().extras.state as Dataset;
  }

  ngOnInit() {
    const datasetName = this.route.snapshot.paramMap.get("ds_name");
    if (!datasetName) {
      this.notify.showError("ds_name parameter not found");
      return;
    }

    if (!this.dataset) {
      // console.log(`load dataset <${dataset_name}>`);
      this.dataService.getDataset(datasetName).subscribe(
        (data) => {
          this.dataset = data;
        },
        (error) => {
          this.notify.showError(error);
        }
      );
    }
  }

  jobSubmit() {
    console.warn("not yet implemented");
  }
}
