import { Component, OnInit, Input } from "@angular/core";
import { DatasetInfo } from "../../types";
import { User } from "@rapydo/types";
import { environment } from "@rapydo/../environments/environment";
import {Directive, HostListener} from "@angular/core";


@Component({
  selector: "hld-applications",
  templateUrl: "./applications.component.html",
  styleUrls: ["./applications.component.scss"],
})
export class ApplicationsComponent implements OnInit {
  @Input() datasets: DatasetInfo[];
  @Input() user: User;

  waterApps: DatasetInfo[] = [];
  paneveggioApps: DatasetInfo[] = [];
  otherApps: DatasetInfo[] = [];
  readonly backendURI = environment.backendURI;

  constructor() {}

  ngOnInit() {
    console.log("init applications");
    this.datasets.forEach((ds) => {
      const category = ds.category?.toLowerCase() || null;
      switch (category) {
        case "water":
          this.waterApps.push(ds);
          break;
        case "paneveggio":
          this.paneveggioApps.push(ds);
          break;
        default:
          this.otherApps.push(ds);
      }
    });
    console.log("water", this.waterApps);
    console.log("paneveggio", this.paneveggioApps);
    console.log("others", this.otherApps);
  }
  
  isCollapsed= true;
  isTruncate= true;
}

