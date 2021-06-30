import { Component, Output, EventEmitter, Injector } from "@angular/core";
import { Subscription } from "rxjs";
import { BasePaginationComponent } from "@rapydo/components/base.pagination.component";
import { Router } from "@angular/router";
import { saveAs as importedSaveAs } from "file-saver-es";
import { DataService } from "../../services/data.service";
import { Request, RequestOutput } from "../../types";
import { environment } from "@rapydo/../environments/environment";

@Component({
  selector: "app-requests",
  templateUrl: "./requests.component.html",
})
export class RequestsComponent extends BasePaginationComponent<Request> {
  expanded: any = {};
  @Output() onLoad: EventEmitter<null> = new EventEmitter<null>();

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

  list(): Subscription {
    const ret = super.list();
    ret.add((response) => {
      this.onLoad.emit();
    });
    return ret;
  }

  downloadByUrl(output_file: RequestOutput) {
    const downloadUrl = this.getFileURL(output_file.timestamp);
    let link = document.createElement("a");
    link.href = downloadUrl;
    link.download = output_file.timestamp;
    link.style.visibility = "hidden";
    link.click();
  }

  copiedToClipboard($event) {
    if ($event["isSuccess"]) {
      this.notify.showSuccess("Copied to Clipboard");
    }
  }

  downloadJSON(jsonBody) {
    const blob = new Blob([jsonBody], { type: "text/plain" });
    importedSaveAs(blob, "query.json");
  }

  toggleExpandRow(row) {
    this.table.rowDetail.toggleExpandRow(row);
  }

  private getFileURL(timestamp) {
    const source_url = `${environment.backendURI}/api/download/${timestamp}`;
    let token = this.auth.getToken();
    return source_url + "?access_token=" + token;
  }
}
