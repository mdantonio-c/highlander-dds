import { Injectable } from "@angular/core";

export class TranslationSet {
  public language: string;
  public values: { [key: string]: string } = {};
}

@Injectable({
  providedIn: "root",
})
export class TranslationService {
  private dictionary: { [key: string]: TranslationSet } = {
    it: {
      language: "it",
      values: {
        indicator: "indicatore",
        "time period": "intervallo temporale",
        "reference period": "periodo di riferimento",
        "territorial units": "unità territoriali",
        "anomaly of": "Anomalia della",
        "annual mean temperature": "temperatura media annuale",
        "winter mean temperature": "temperatura media invernale",
        "spring mean temperature": "temperatura media primaverile",
        "summer mean temperature": "temperatura media estiva",
        "autumn mean temperature": "temperatura media autunnale",
        "no stripes available": "nessuna stripe disponibile",
        "try to apply a different set of filters":
          "prova ad applicare un diverso set di filtri",
      },
    },
  };

  constructor() {}

  translate(key: string, lang = "en"): string {
    if (!key) return;
    if (this.dictionary[lang] != null) {
      key = key.trim().toLowerCase();
      return this.dictionary[lang].values[key];
    }
  }
}
