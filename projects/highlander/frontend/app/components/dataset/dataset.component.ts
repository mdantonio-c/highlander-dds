import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Dataset } from "../../types";
import { NotificationService } from "@rapydo/services/notification";
import { AuthService } from "@rapydo/services/auth";
import { DataService } from "../../services/data.service";
import { Observable } from "rxjs";
import { User } from "@rapydo/types";

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
    private ref: ChangeDetectorRef
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
    console.warn("not yet implemented");
  }
}
