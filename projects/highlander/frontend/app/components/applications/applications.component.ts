import { Component, OnInit, Input } from "@angular/core";
import { DatasetInfo } from "../../types";
import { User } from "@rapydo/types";

@Component({
  selector: "hld-applications",
  templateUrl: "./applications.component.html",
  styleUrls: ["./applications.component.scss"],
})
export class ApplicationsComponent implements OnInit {
  @Input() datasets: DatasetInfo[];
  @Input() user: User;

  categories = new Map<string, DatasetInfo[]>();

  ngOnInit() {
    this.datasets.forEach((ds) => {
      const cItem = ds.category?.toLowerCase() || "various";
      this.categories.has(cItem)
        ? this.categories.get(cItem).push(ds)
        : this.categories.set(cItem, [ds]);
    });
  }
}
