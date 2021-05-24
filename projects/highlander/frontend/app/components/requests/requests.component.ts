import { Component, Output, EventEmitter, Injector } from "@angular/core";
import { BasePaginationComponent } from "@rapydo/components/base.pagination.component";
import { DataService } from "../../services/data.service";
import { Router, NavigationExtras } from "@angular/router";
import { saveAs as importedSaveAs } from "file-saver-es";
import { Request } from "../../types";

@Component({
  selector: "app-requests",
  templateUrl: "./requests.component.html",
})
export class RequestsComponent extends BasePaginationComponent<Request> {
  constructor(
    protected injector: Injector,
    public dataService: DataService,
    private router: Router
  ) {
    super(injector);
    this.init("request", "/api/requests", "Requests");
    this.initPaging(20, true);
    this.list();
  }

  download(filename) {
    this.dataService.downloadData(filename).subscribe(
      (resp) => {
        const contentType =
          resp.headers["content-type"] || "application/octet-stream";
        const blob = new Blob([resp.body], { type: contentType });
        importedSaveAs(blob, filename);
      },
      (error) => {
        this.notify.showError(`Unable to download file: ${filename}`);
      }
    );
  }
}
