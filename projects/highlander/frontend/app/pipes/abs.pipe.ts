import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "abs",
})
export class AbsPipe implements PipeTransform {
  transform(input: any): any {
    if (!this.isNumberFinite(input)) {
      return "NaN";
    }
    return Math.abs(input);
  }

  private isNumberFinite(value: any): value is number {
    return typeof value === "number" && isFinite(value);
  }
}
