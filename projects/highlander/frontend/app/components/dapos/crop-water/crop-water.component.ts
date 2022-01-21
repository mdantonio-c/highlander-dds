import { Component, OnInit, Input } from "@angular/core";
import { DatasetInfo } from "../../../types";

@Component({
  selector: "app-crop-water",
  templateUrl: "./crop-water.component.html",
  styleUrls: ["./crop-water.component.scss"],
})
export class CropWaterComponent implements OnInit {
  @Input()
  dataset: DatasetInfo;

  constructor() {}

  ngOnInit() {}
}
