import { Component, Input } from "@angular/core";
import { DatasetInfo } from "../../types";
import { environment } from "@rapydo/../environments/environment";

@Component({
  selector: "hld-dataset-card",
  templateUrl: "./dataset-card.component.html",
  styleUrls: ["./dataset-card.component.scss"],
})
export class DatasetCardComponent {
  @Input() dataset: DatasetInfo;
  readonly backendURI = environment.backendURI;

  isCollapsed = true;
  isTruncate = true;
  hasDataset = true;
  externalInfoPage = false;

  ngOnInit() {
    if ("source_path" in this.dataset) {
      // it means that the dataset does not have data in the dds and does not have a corresponding dataset page
      this.hasDataset = false;
    }
    if ("dataset_info_url" in this.dataset) {
      // it means that the dataset has an info page not in the dds ex. in the ckan catalogue
      this.externalInfoPage = true;
    }
  }
}
