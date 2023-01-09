import { AfterViewInit, Directive, ElementRef } from "@angular/core";
declare var Holder: any;

@Directive({
  selector: "[holderjs]",
})
export class HolderjsDirective implements AfterViewInit {
  constructor(public el: ElementRef) {}

  ngAfterViewInit() {
    Holder.run({ images: this.el.nativeElement });
  }
}
