import { Component, OnInit, Input } from "@angular/core";
import { DatasetInfo } from "../../../types";

@Component({
  selector: "app-human-wellbeing",
  templateUrl: "./human-wellbeing.component.html",
  styleUrls: ["./human-wellbeing.component.scss"],
})
export class HumanWellbeingComponent implements OnInit {
  @Input()
  dataset: DatasetInfo;

  constructor() {}

  ngOnInit() {}
}
