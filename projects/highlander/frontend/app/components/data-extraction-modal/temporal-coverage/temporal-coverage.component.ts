import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { Widget } from "../../../types";

@Component({
  selector: "app-temporal-coverage",
  templateUrl: "./temporal-coverage.component.html",
  styleUrls: ["./temporal-coverage.component.scss"],
})
export class TemporalCoverageComponent implements OnInit {
  @Input() widgets: Widget[] = [];
  @Output() dateChanged: EventEmitter<any> = new EventEmitter<any>();

  date_list: Widget;
  date_range: Widget;

  ngOnInit(): void {
    this.date_list = this.getWidget("date_list");
    this.date_range = this.getWidget("date_range");
  }

  getWidget(widgetName: string): Widget {
    // @ts-ignore
    return this.widgets.find((w) => w.name == widgetName);
  }

  onListChange(e: Event, filter: string) {
    this.dateChanged.emit({ event: e, filter: filter });
  }
}
