import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "lastWord",
})
export class LastWordPipe implements PipeTransform {
  transform(value: string, separator: string = " "): string | boolean {
    if (!value) {
      return "";
    }
    return value.trim().split(separator).pop();
  }
}
