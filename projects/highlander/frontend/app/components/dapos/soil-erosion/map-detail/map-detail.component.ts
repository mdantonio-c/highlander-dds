import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { DetailService } from "../services/detail.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { environment } from "@rapydo/../environments/environment";
import { ADMINISTRATIVE_AREAS, INDICATORS, SOIL_EROSION_WMS } from "../data";
import { DataService } from "../../../../services/data.service";

@Component({
  selector: "hl-map-detail",
  templateUrl: "./map-detail.component.html",
  styleUrls: ["./map-detail.component.scss"],
})
export class MapDetailComponent implements OnChanges {
  @Input() cropDetails;
  @Input() modelId;
  @Input() isPanelCollapsed;

  mapImage: any;
  plotImage: any;
  productLabel: string;

  loading = false;
  constructor(
    private detailService: DetailService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnChanges() {
    if (!this.isPanelCollapsed) {
      // add the model id to the crop details
      this.cropDetails.model = this.modelId;
      console.log("get details for:", this.cropDetails);
      //add the label to be display in the panel
      this.productLabel = INDICATORS.find(
        (x) => x.product == this.cropDetails.product
      ).label;

      setTimeout(() => {
        this.spinner.show();
      }, 0);

      this.detailService
        .getAllDetails(this.cropDetails)
        .subscribe(
          (blobs) => {
            console.log("get all blobs");
            this.mapImage = this.sanitizer.bypassSecurityTrustUrl(
              URL.createObjectURL(blobs[0])
            );
            this.plotImage = this.sanitizer.bypassSecurityTrustUrl(
              URL.createObjectURL(blobs[1])
            );
            this.loading = true;
          },
          (error) => {
            this.loading = false;
            error.text().then((value) => {
              this.notify.showError(value);
            });
          }
        )
        .add(() => {
          this.spinner.hide();
        });
    }
  }
}
