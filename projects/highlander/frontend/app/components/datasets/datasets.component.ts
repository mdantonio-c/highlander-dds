import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { AuthService } from "@rapydo/services/auth";
import { DataService } from "../../services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { DatasetInfo } from "../../types";
import { User } from "@rapydo/types";
import { SSRService } from "@rapydo/services/ssr";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { environment } from "@rapydo/../environments/environment";

@Component({
  selector: "app-datasets",
  templateUrl: "./datasets.component.html",
  styleUrls: ["./datasets.component.css"],
})
export class DatasetsComponent implements OnInit {
  datasets: DatasetInfo[];
  user: User;
  isApplication: boolean;
  readonly backendURI = environment.backendURI;
  title: string;

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private router: Router,
    private notify: NotificationService,
    private ref: ChangeDetectorRef,
    private spinner: NgxSpinnerService,
    public ssr: SSRService
  ) {
    router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isApplication = (event as NavigationEnd).url.endsWith(
          "applications"
        );
        this.title = this.isApplication ? "Applications" : "Datasets";
      });
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
    if (this.ssr.isBrowser) {
      this.loadDatasets();
    }
  }

  private loadDatasets() {
    this.spinner.show();
    this.dataService
      .getDatasets(this.isApplication)
      .subscribe(
        (data) => {
          this.datasets = data;
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
