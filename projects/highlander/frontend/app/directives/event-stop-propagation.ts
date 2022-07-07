import { Directive, HostListener, ElementRef } from "@angular/core";

@Directive({
  selector: "[event-stop-propagation]",
})
export class EventStopPropagation {
  constructor(el: ElementRef) {
    el.nativeElement.style.cursor = "text";
  }

  @HostListener("dblclick", ["$event"])
  @HostListener("click", ["$event"])
  @HostListener("mousedown", ["$event"])
  @HostListener("wheel", ["$event"])
  public onClick(event: any): void {
    // event.preventDefault();
    event.stopPropagation();
  }
}
