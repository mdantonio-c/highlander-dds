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
import { ADMINISTRATIVE_AREAS, INDICATORS, TIME_PERIODS } from "../data";
import { DataService } from "../../../../services/data.service";

@Component({
  selector: "climate-stripes",
  templateUrl: "./stripes.component.html",
  styleUrls: ["./stripes.component.scss"],
})
export class StripesComponent implements OnChanges {
  @Input() stripesDetails;
  @Input() administrative;

  stripesImage: any;
  dateLabel: string;
  indicatorLabel: string;

  loading = false;
  constructor(
    private detailService: DetailService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges() {
    if (this.administrative == "italy") {
      this.loading = true;
      console.log("get stripes for :", this.stripesDetails.time_period);

      this.dateLabel = TIME_PERIODS.find(
        (x) => x.code == this.stripesDetails.time_period,
      ).label.substring(0, 6);

      this.indicatorLabel = INDICATORS.find(
        (x) => x.code == this.stripesDetails.indicator,
      ).label.split(" ")[0];

      setTimeout(() => {
        this.spinner.show();
      }, 0);

      this.detailService
        .getStripes(this.stripesDetails)
        .subscribe(
          (blobs) => {
            console.log("get all blobs");
            this.stripesImage = this.sanitizer.bypassSecurityTrustUrl(
              URL.createObjectURL(blobs[0]),
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
}
