import {
  Component,
  Input,
  OnChanges,
  ChangeDetectorRef,
  SimpleChanges,
  Output,
  EventEmitter,
} from "@angular/core";
import * as moment from "moment";
import { DomSanitizer } from "@angular/platform-browser";
import { DetailService } from "../services/detail.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { environment } from "@rapydo/../environments/environment";
import { ADMINISTRATIVE_AREAS, INDICATORS } from "../data";
import { DataService } from "../../../../services/data.service";

@Component({
  selector: "era5-map-detail",
  templateUrl: "./map-detail.component.html",
  styleUrls: ["./map-detail.component.scss"],
})
export class MapDetailComponent implements OnChanges {
  @Input() cropDetails;
  @Input() isPanelCollapsed;

  mapImage: any;
  plotImage: any;
  productLabel: string;
  dateLabel: string;

  loading = false;
  constructor(
    private detailService: DetailService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges() {
    if (!this.isPanelCollapsed) {
      this.loading = true;
      console.log("get details for:", this.cropDetails);
      //add the label to be display in the panel
      this.productLabel = INDICATORS.find(
        (x) => x.code == this.cropDetails.indicator
      ).label;

      // if (this.cropDetails.date) {
      //   this.dateLabel = moment(this.cropDetails.date).format("DD/MM/YYYY");
      // }

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
          this.cdr.detectChanges();
        });
    }
  }
}
