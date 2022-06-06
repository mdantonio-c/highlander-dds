import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from "@angular/core";
import { environment } from "@rapydo/../environments/environment";
import { ADMINISTRATIVE_AREAS, INDICATORS, SOIL_EROSION_WMS } from "../data";

@Component({
  selector: "hl-map-detail",
  templateUrl: "./map-detail.component.html",
  styleUrls: ["./map-detail.component.scss"],
})
export class MapDetailComponent implements OnChanges {
  @Input() cropDetails;
  @Input() modelId;

  ngOnChanges() {
    console.log("details changed", this.cropDetails);
    console.log(this.modelId);
  }
}
