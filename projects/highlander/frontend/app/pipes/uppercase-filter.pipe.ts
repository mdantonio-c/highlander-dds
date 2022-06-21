import {Pipe, PipeTransform} from "@angular/core";

@Pipe({
    name: "uppercaseFilter",
})
export class UppercaseFilterPipe implements PipeTransform {
    transform(value: any): any {
        return Object.fromEntries(
            Object.entries(value).filter(([key]) => key === key.toUpperCase()));
    }
}