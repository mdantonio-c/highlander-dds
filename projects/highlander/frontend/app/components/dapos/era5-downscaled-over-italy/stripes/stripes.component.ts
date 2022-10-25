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
  selector: "climate-stripes",
  templateUrl: "./stripes.component.html",
  styleUrls: ["./stripes.component.scss"],
})
export class StripesComponent implements OnChanges {
  @Input() timePeriod;

  stripesImage: any;

  loading = false;
  constructor(
    private detailService: DetailService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges() {
    this.loading = true;
    console.log("get stripes for:", this.timePeriod);

    setTimeout(() => {
      this.spinner.show();
    }, 0);

    this.detailService
      .getStripes(this.timePeriod)
      .subscribe(
        (blobs) => {
          console.log("get all blobs");
          this.stripesImage = this.sanitizer.bypassSecurityTrustUrl(
            URL.createObjectURL(blobs[0])
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
