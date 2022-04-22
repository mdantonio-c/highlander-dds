import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { Widget } from "../../../types";

@Component({
  selector: "app-exclusive-frame",
  templateUrl: "./exclusive-frame.component.html",
  styleUrls: ["./exclusive-frame.component.scss"],
})
export class ExclusiveFrameComponent implements OnInit {
  @Input() comp: Widget;
  @Input() widgets: Widget[] = [];
  @Output() dataChanged: EventEmitter<any> = new EventEmitter<any>();

  data_list: Widget;
  data_range: Widget;

  ngOnInit() {
    this.comp.details.widgets.forEach((n) => {
      let w = this.getWidget(n);
      switch (w.type) {
        case "StringList":
        case "IntList":
          this.data_list = w;
          break;
        case "NumberRange":
          this.data_range = w;
          break;
        default:
          console.warn(`Cannot manage ${w.type} type for ${w.name}`, w);
      }
    });
  }

  getWidget(widgetName: string): Widget {
    // @ts-ignore
    return this.widgets.find((w) => w.name == widgetName);
  }

  onListChange(e: Event, filter: string, wType: string) {
    this.dataChanged.emit({ event: e, filter: filter, type: wType });
  }
}
