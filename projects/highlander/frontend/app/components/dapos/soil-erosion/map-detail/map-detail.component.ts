import { Component, Input, OnChanges, ChangeDetectorRef } from "@angular/core";
import { saveAs as importedSaveAs } from "file-saver-es";
import { DomSanitizer } from "@angular/platform-browser";
import { DetailService } from "../services/detail.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { INDICATORS } from "../data";

@Component({
  selector: "hl-map-detail",
  templateUrl: "./map-detail.component.html",
  styleUrls: ["./map-detail.component.scss"],
})
export class MapDetailComponent implements OnChanges {
  @Input() cropDetails;
  @Input() modelId;
  @Input() user;
  @Input() isPanelCollapsed;

  mapImage: any;
  plotImage: any;
  productLabel: string;

  loading = false;
  constructor(
    private detailService: DetailService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges() {
    if (!this.isPanelCollapsed) {
      this.loading = true;
      // add the model id to the crop details
      this.cropDetails.model = this.modelId;
      console.log("get details for:", this.cropDetails);
      //add the label to be display in the panel
      this.productLabel = INDICATORS.find(
        (x) => x.product == this.cropDetails.product,
      ).label;

      setTimeout(() => {
        this.spinner.show();
      }, 0);

      this.detailService
        .getAllDetails(this.cropDetails)
        .subscribe(
          (blobs) => {
            this.mapImage = this.sanitizer.bypassSecurityTrustUrl(
              URL.createObjectURL(blobs[0]),
            );
            this.plotImage = this.sanitizer.bypassSecurityTrustUrl(
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
      .createReport(this.cropDetails, this.productLabel)
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
