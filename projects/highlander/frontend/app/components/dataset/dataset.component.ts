import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { DatasetInfo } from "../../types";
import { NotificationService } from "@rapydo/services/notification";
import { AuthService } from "@rapydo/services/auth";
import { DataService } from "../../services/data.service";
import { Observable } from "rxjs";
import { User } from "@rapydo/types";
import { NgxSpinnerService } from "ngx-spinner";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { DataExtractionModalComponent } from "../data-extraction-modal/data-extraction-modal.component";
import { environment } from "@rapydo/../environments/environment";

@Component({
  selector: "app-dataset",
  templateUrl: "./dataset.component.html",
})
export class DatasetComponent implements OnInit {
  dataset: DatasetInfo;
  user: User;
  readonly backendURI = environment.backendURI;

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    public route: ActivatedRoute,
    private router: Router,
    private notify: NotificationService,
    private ref: ChangeDetectorRef,
    private spinner: NgxSpinnerService,
    private modalService: NgbModal
  ) {
    this.dataset = this.router.getCurrentNavigation().extras
      .state as DatasetInfo;
  }

  ngOnInit() {
    this.authService.isAuthenticated().subscribe((isAuth) => {
      this.user = isAuth ? this.authService.getUser() : null;
    });
    this.authService.userChanged.subscribe((user) => {
      if (user === this.authService.LOGGED_OUT) {
        this.user = null;
        this.ref.detectChanges();
      } else if (user === this.authService.LOGGED_IN) {
        this.user = this.authService.getUser();
      }
    });

    const datasetName = this.route.snapshot.paramMap.get("ds_name");
    if (!datasetName) {
      this.notify.showError("ds_name parameter not found");
      return;
    }

    if (!this.dataset) {
      // console.log(`load dataset <${dataset_name}>`);
      this.spinner.show();
      this.dataService
        .getDataset(datasetName)
        .subscribe(
          (data) => {
            this.dataset = data;
          },
          (error) => {
            this.notify.showError(error);
          }
        )
        .add(() => {
          this.spinner.hide();
        });
    }
  }

  jobSubmit(args) {
    this.spinner.show();
    console.log(`submit job request for dataset <${this.dataset.id}>`, args);
    this.dataService
      .submit(this.dataset.id, args)
      .subscribe(
        (ack) => {
          this.notify.showSuccess("Request Accepted");
        },
        (error) => {
          this.notify.showError(error);
        }
      )
      .add(() => {
        this.spinner.hide();
      });
  }

  openDataExtractionModal() {
    // FIXME atm use default product. We don't have multi-products cases yet!
    const productId = this.dataset.default;
    console.log(`open data extraction for product ${productId}`);
    const modalRef = this.modalService.open(DataExtractionModalComponent, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
    });
    modalRef.componentInstance.dataset = this.dataset;
    modalRef.componentInstance.productId = productId;
    modalRef.componentInstance.passEntry.subscribe((args: any) => {
      this.jobSubmit(args);
    });
  }
}