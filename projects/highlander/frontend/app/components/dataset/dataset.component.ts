import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Dataset } from "../../types";
import { NotificationService } from "@rapydo/services/notification";
import { AuthService } from "@rapydo/services/auth";
import { DataService } from "../../services/data.service";
import { Observable } from "rxjs";
import { User } from "@rapydo/types";
import { NgxSpinnerService } from "ngx-spinner";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { DataExtractionModalComponent } from "../data-extraction-modal/data-extraction-modal.component";

@Component({
  selector: "app-dataset",
  templateUrl: "./dataset.component.html",
})
export class DatasetComponent implements OnInit {
  dataset: Dataset;
  // dataset$: Observable<Dataset>;
  user: User;

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
    this.dataset = this.router.getCurrentNavigation().extras.state as Dataset;
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
      this.dataService.getDataset(datasetName).subscribe(
        (data) => {
          this.dataset = data;
        },
        (error) => {
          this.notify.showError(error);
        }
      );
    }
  }

  jobSubmit() {
    this.spinner.show();
    console.log(`submit job request for dataset <${this.dataset.name}>`);
    this.dataService
      .submit(this.dataset.name)
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
    console.log("open data extraction", this.dataset);
    const modalRef = this.modalService.open(DataExtractionModalComponent, {
      backdrop: "static",
      size: "lg",
      keyboard: false,
    });
    modalRef.componentInstance.dataset = this.dataset;
    modalRef.componentInstance.passEntry.subscribe((req: any) => {
      this.jobSubmit();
    });
  }
}
