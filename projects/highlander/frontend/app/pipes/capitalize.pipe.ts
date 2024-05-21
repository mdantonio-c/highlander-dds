import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "capitalize",
})
export class CapitalizePipe implements PipeTransform {
  transform(
    value: string,
    capitalizationMethod: "allUpperCase" | "titleCase" | "sentenceCase",
  ): string {
    if (capitalizationMethod === "allUpperCase") {
      return value.toUpperCase();
    } else if (capitalizationMethod === "titleCase") {
      const splitString = value
        .split(" ")
        .map((s) => `${s[0].toUpperCase()}${s.slice(1)}`);
      return splitString.join(" ");
    } else if (capitalizationMethod === "sentenceCase") {
      const splitString = value.split(".").map((s) => {
        const trimmedString = s.trim();
        if (trimmedString.length > 0) {
          return `${trimmedString[0].toUpperCase()}${trimmedString.slice(1)}`;
        }
        return "";
      });
      return splitString.join(". ");
    }
    return "";
  }
}
