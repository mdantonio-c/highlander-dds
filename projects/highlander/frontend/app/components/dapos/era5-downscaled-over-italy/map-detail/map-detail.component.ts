import { Component, Input, OnChanges, ChangeDetectorRef } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { saveAs as importedSaveAs } from "file-saver-es";
import { DetailService } from "../services/detail.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { ADMINISTRATIVE_AREAS, INDICATORS, TIME_PERIODS } from "../data";

@Component({
  selector: "era5-map-detail",
  templateUrl: "./map-detail.component.html",
  styleUrls: ["./map-detail.component.scss"],
})
export class MapDetailComponent implements OnChanges {
  @Input() cropDetails;
  @Input() user;
  @Input() isDetailVisible;

  mapImage: any;
  stripesImage: any;
  productLabel: string;
  indicatorLabel: string;
  dateLabel: string;

  loading = false;
  constructor(
    private detailService: DetailService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges() {
    if (this.isDetailVisible) {
      this.loading = true;
      console.log("get details for:", this.cropDetails);
      //add the label to be display in the panel
      const indicatorObject = INDICATORS.find(
        (x) => x.code == this.cropDetails.indicator,
      );

      this.productLabel = indicatorObject.plotLabel;
      this.dateLabel = TIME_PERIODS.find(
        (x) => x.code == this.cropDetails.time_period,
      ).label.substring(0, 6);

      this.indicatorLabel = indicatorObject.label.split(" ")[0];

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
              URL.createObjectURL(blobs[0]),
            );
            this.stripesImage = this.sanitizer.bypassSecurityTrustUrl(
              URL.createObjectURL(blobs[1]),
            );
          },
          (error) => {
            this.loading = false;
            error.text().then((value) => {
              this.notify.showError(value);
            });
          },
        )
        .add(() => {
          this.spinner.hide();
          this.cdr.detectChanges();
        });
    }
  }
  getReport() {
    setTimeout(() => {
      this.spinner.show();
    }, 0);
    this.detailService
      .createReport(this.cropDetails, this.productLabel, this.dateLabel)
      .subscribe(
        (response) => {
          const contentType =
            response.headers["content-type"] || "application/pdf";
          const blob = new Blob([response.body], { type: contentType });
          importedSaveAs(blob, "highlander_report.pdf");
        },
        (error) => {
          this.notify.showError("Unable to create the report");
        },
      )
      .add(() => {
        this.spinner.hide();
      });
  }
}
