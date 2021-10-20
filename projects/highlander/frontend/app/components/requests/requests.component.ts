import { Component, Output, EventEmitter, Injector } from "@angular/core";
import { Subject } from "rxjs";
import { take } from "rxjs/operators";
import { BasePaginationComponent } from "@rapydo/components/base.pagination.component";
import { Router } from "@angular/router";
import { saveAs as importedSaveAs } from "file-saver-es";
import { DataService } from "../../services/data.service";
import { Request, RequestOutput } from "../../types";
import { environment } from "@rapydo/../environments/environment";
import streamSaver from "streamsaver";

declare global {
  interface Window {
    writer: any;
  }
}

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

  public list(): Subject<boolean> {
    const subject = super.list();

    subject.pipe(take(1)).subscribe((success: boolean) => {
      this.onLoad.emit();
    });
    return subject;
  }

  downloadByUrl(output_file: RequestOutput) {
    let timestamp = output_file.timestamp;
    if (!timestamp) {
      // expected timestamp in the filename
      // remove file extension
      timestamp = output_file.filename.replace(/\.[^/.]+$/, "");
    }
    const downloadUrl = this.getFileURL(timestamp);
    let link = document.createElement("a");
    link.href = downloadUrl;
    link.download = output_file.timestamp;
    link.style.visibility = "hidden";
    link.click();
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
