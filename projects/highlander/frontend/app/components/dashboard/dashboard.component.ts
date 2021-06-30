import { Component, ViewChild } from "@angular/core";
import { RequestsComponent } from "../requests/requests.component";
import { NgbNavChangeEvent } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent {
  selectedTabId = "requests";
  @ViewChild("rTab", { static: false }) requests: RequestsComponent;

  onTabChange($event: NgbNavChangeEvent) {
    this.selectedTabId = $event.nextId;
  }

  list() {
    if (this.selectedTabId === "requests") {
      this.requests.list();
    }
  }
}
