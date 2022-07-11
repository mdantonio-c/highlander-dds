import { Component, Input } from "@angular/core";
import { DatasetInfo } from "../../types";

@Component({
  selector: "hld-dataset-card",
  templateUrl: "./dataset-card.component.html",
  styleUrls: ["./dataset-card.component.scss"],
})
export class DatasetCardComponent {
  @Input() dataset: DatasetInfo;
  @Input() isLoggedIn: boolean = false;

  isCollapsed = true;
  isTruncate = true;
}
